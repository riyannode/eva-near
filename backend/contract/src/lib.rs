use near_sdk::store::LookupMap;
use near_sdk::{AccountId, NearToken, PanicOnDefault, Promise, env, near, require};

const RECORDS_PREFIX: &[u8] = b"references";

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Reference {
    references: LookupMap<[u8; 16], Record>,
}

#[near(serializers = [borsh])]
pub struct Record {
    issuer_id: AccountId,
    commitment: [u8; 32],
    revoked: bool,
}

#[near(serializers = [json])]
pub struct RecordView {
    issuer_id: AccountId,
    commitment: String,
    revoked: bool,
}

#[near]
impl Reference {
    #[init]
    pub fn init() -> Self {
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "FORBIDDEN"
        );
        Self {
            references: LookupMap::new(RECORDS_PREFIX),
        }
    }

    #[payable]
    pub fn issue(&mut self, reference_id: String, commitment: String) -> String {
        let id = decode_hex::<16>(&reference_id);
        let commitment = decode_hex::<32>(&commitment);
        let issuer = env::predecessor_account_id();
        let deposit = env::attached_deposit().as_yoctonear();
        if let Some(record) = self.references.get(&id) {
            require!(!record.revoked, "REFERENCE_REVOKED");
            require!(
                record.issuer_id == issuer && record.commitment == commitment,
                "REFERENCE_CONFLICT"
            );
            refund(&issuer, deposit);
            return "UNCHANGED".to_string();
        }
        let before = env::storage_usage();
        self.references.insert(
            id,
            Record {
                issuer_id: issuer.clone(),
                commitment,
                revoked: false,
            },
        );
        self.references.flush();
        let cost =
            u128::from(env::storage_usage() - before) * env::storage_byte_cost().as_yoctonear();
        require!(deposit >= cost, "INSUFFICIENT_DEPOSIT");
        refund(&issuer, deposit - cost);
        "ISSUED".to_string()
    }

    pub fn revoke(&mut self, reference_id: String) -> String {
        let id = decode_hex::<16>(&reference_id);
        let record = self.references.get_mut(&id).expect("REFERENCE_NOT_FOUND");
        require!(
            record.issuer_id == env::predecessor_account_id(),
            "FORBIDDEN"
        );
        if record.revoked {
            return "UNCHANGED".to_string();
        }
        record.revoked = true;
        "REVOKED".to_string()
    }

    pub fn get_reference(&self, reference_id: String) -> Option<RecordView> {
        self.references
            .get(&decode_hex::<16>(&reference_id))
            .map(|record| RecordView {
                issuer_id: record.issuer_id.clone(),
                commitment: encode_hex(&record.commitment),
                revoked: record.revoked,
            })
    }
}

fn refund(account: &AccountId, amount: u128) {
    if amount > 0 {
        Promise::new(account.clone())
            .transfer(NearToken::from_yoctonear(amount))
            .detach();
    }
}

fn decode_hex<const N: usize>(value: &str) -> [u8; N] {
    require!(
        value.len() == N * 2
            && value
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)),
        "INVALID_INPUT"
    );
    let mut bytes = [0; N];
    for (index, byte) in bytes.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&value[index * 2..index * 2 + 2], 16).expect("INVALID_INPUT");
    }
    bytes
}

fn encode_hex<const N: usize>(value: &[u8; N]) -> String {
    let mut result = String::with_capacity(N * 2);
    for byte in value {
        use std::fmt::Write as _;
        write!(&mut result, "{byte:02x}").expect("write to String");
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::mock::MockAction;
    use near_sdk::test_utils::{VMContextBuilder, accounts, get_created_receipts};
    use near_sdk::testing_env;

    const ID: &str = "00112233445566778899aabbccddeeff";
    const HASH: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    fn context(account: AccountId, deposit: u128) {
        testing_env!(
            VMContextBuilder::new()
                .current_account_id(accounts(0))
                .predecessor_account_id(account)
                .attached_deposit(NearToken::from_yoctonear(deposit))
                .build()
        );
    }
    fn contract() -> Reference {
        context(accounts(0), 0);
        Reference::init()
    }
    fn panic_text(f: impl FnOnce()) -> String {
        let error =
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(f)).expect_err("expected panic");
        error
            .downcast_ref::<String>()
            .cloned()
            .or_else(|| error.downcast_ref::<&str>().map(|x| x.to_string()))
            .unwrap_or_default()
    }
    fn assert_refund(account: AccountId, amount: u128) {
        let receipts = get_created_receipts();
        assert_eq!(receipts.len(), 1);
        assert_eq!(receipts[0].receiver_id, account);
        assert!(matches!(
            receipts[0].actions.as_slice(),
            [MockAction::Transfer { deposit, .. }] if deposit.as_yoctonear() == amount
        ));
    }

    #[test]
    fn issue_owner_conflict_revoke_and_no_overwrite() {
        let mut c = contract();
        context(accounts(1), 10u128.pow(22));
        assert_eq!(c.issue(ID.into(), HASH.into()), "ISSUED");
        context(accounts(1), 10u128.pow(22));
        assert_eq!(c.issue(ID.into(), HASH.into()), "UNCHANGED");
        assert_refund(accounts(1), 10u128.pow(22));
        assert!(
            panic_text(|| {
                c.issue(ID.into(), "b".repeat(64));
            })
            .contains("REFERENCE_CONFLICT")
        );
        context(accounts(2), 10u128.pow(22));
        assert!(
            panic_text(|| {
                c.issue(ID.into(), HASH.into());
            })
            .contains("REFERENCE_CONFLICT")
        );
        assert!(
            panic_text(|| {
                c.revoke(ID.into());
            })
            .contains("FORBIDDEN")
        );
        let view = c.get_reference(ID.into()).unwrap();
        assert_eq!(view.issuer_id, accounts(1));
        assert_eq!(view.commitment, HASH);
        context(accounts(1), 0);
        assert_eq!(c.revoke(ID.into()), "REVOKED");
        assert_eq!(c.revoke(ID.into()), "UNCHANGED");
        assert!(
            panic_text(|| {
                c.issue(ID.into(), HASH.into());
            })
            .contains("REFERENCE_REVOKED")
        );
        assert!(c.get_reference(ID.into()).unwrap().revoked);
    }
    #[test]
    fn validates_inputs_and_storage_bound_with_longest_account() {
        let mut c = contract();
        let owner: AccountId = "a".repeat(64).parse().unwrap();
        let deposit = 10u128.pow(22);
        context(owner.clone(), deposit);
        assert!(
            panic_text(|| {
                c.issue("bad".into(), HASH.into());
            })
            .contains("INVALID_INPUT")
        );
        assert!(
            panic_text(|| {
                c.issue(ID.into(), "G".repeat(64));
            })
            .contains("INVALID_INPUT")
        );
        let before = env::storage_usage();
        assert_eq!(c.issue(ID.into(), HASH.into()), "ISSUED");
        let cost =
            u128::from(env::storage_usage() - before) * env::storage_byte_cost().as_yoctonear();
        assert!(cost > 0 && cost < deposit);
        assert_refund(owner.clone(), deposit - cost);
        context(owner.clone(), cost);
        assert_eq!(c.issue("1".repeat(32), HASH.into()), "ISSUED");
        assert!(get_created_receipts().is_empty());

        // The VM reverts writes on panic. The unit-test mock retains them.
        context(owner, cost - 1);
        assert!(
            panic_text(|| {
                c.issue("2".repeat(32), HASH.into());
            })
            .contains("INSUFFICIENT_DEPOSIT")
        );
        assert!(get_created_receipts().is_empty());
    }
}
