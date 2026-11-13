use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use near_sdk::store::LookupMap;
use near_sdk::{AccountId, PanicOnDefault, env, near, require};

const RECORDS_PREFIX: &[u8] = b"eva:reference:v1:records";
const CAP: u32 = 1024;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Reference {
    issuer_id: AccountId,
    issuer_key: [u8; 32],
    issued_count: u32,
    references: LookupMap<[u8; 16], Record>,
}

#[near(serializers = [borsh])]
pub struct Record {
    commitment: [u8; 32],
    revoked: bool,
}

#[near(serializers = [json])]
pub struct RecordView {
    commitment: String,
    revoked: bool,
}

#[near(serializers = [json])]
pub struct ReferenceView {
    issuer_id: AccountId,
    issuer_key: String,
    record: Option<RecordView>,
}

#[near]
impl Reference {
    #[init]
    pub fn init(issuer_id: AccountId, issuer_key: String) -> Self {
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "FORBIDDEN"
        );
        require!(env::attached_deposit().as_yoctonear() == 0, "INVALID_INPUT");
        let issuer_key = decode_key(&issuer_key);
        Self {
            issuer_id,
            issuer_key,
            issued_count: 0,
            references: LookupMap::new(RECORDS_PREFIX),
        }
    }

    pub fn issue(&mut self, reference_id: String, commitment: String) -> String {
        self.assert_issuer();
        require!(env::attached_deposit().as_yoctonear() == 0, "INVALID_INPUT");
        let reference_id = decode_hex::<16>(&reference_id);
        let commitment = decode_hex::<32>(&commitment);
        if let Some(record) = self.references.get(&reference_id) {
            require!(!record.revoked, "REFERENCE_REVOKED");
            require!(record.commitment == commitment, "REFERENCE_CONFLICT");
            return "UNCHANGED".to_string();
        }
        require!(self.issued_count < CAP, "CAP_REACHED");
        self.issued_count = self.issued_count.checked_add(1).expect("CAP_REACHED");
        self.references.insert(
            reference_id,
            Record {
                commitment,
                revoked: false,
            },
        );
        "ISSUED".to_string()
    }

    pub fn revoke(&mut self, reference_id: String) -> String {
        self.assert_issuer();
        require!(env::attached_deposit().as_yoctonear() == 0, "INVALID_INPUT");
        let reference_id = decode_hex::<16>(&reference_id);
        let record = self
            .references
            .get_mut(&reference_id)
            .expect("REFERENCE_NOT_FOUND");
        if record.revoked {
            return "UNCHANGED".to_string();
        }
        record.revoked = true;
        "REVOKED".to_string()
    }

    pub fn get_reference(&self, reference_id: String) -> ReferenceView {
        let reference_id = decode_hex::<16>(&reference_id);
        ReferenceView {
            issuer_id: self.issuer_id.clone(),
            issuer_key: URL_SAFE_NO_PAD.encode(self.issuer_key),
            record: self.references.get(&reference_id).map(|record| RecordView {
                commitment: encode_hex(&record.commitment),
                revoked: record.revoked,
            }),
        }
    }

    fn assert_issuer(&self) {
        require!(env::predecessor_account_id() == self.issuer_id, "FORBIDDEN");
    }
}

fn decode_key(value: &str) -> [u8; 32] {
    let bytes = URL_SAFE_NO_PAD.decode(value).expect("INVALID_INPUT");
    require!(
        bytes.len() == 32 && URL_SAFE_NO_PAD.encode(&bytes) == value,
        "INVALID_INPUT"
    );
    bytes.try_into().expect("INVALID_INPUT")
}

fn decode_hex<const N: usize>(value: &str) -> [u8; N] {
    require!(value.len() == N * 2, "INVALID_INPUT");
    require!(
        value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte)),
        "INVALID_INPUT"
    );
    let mut bytes = [0; N];
    for (index, byte) in bytes.iter_mut().enumerate() {
        let offset = index * 2;
        *byte = u8::from_str_radix(&value[offset..offset + 2], 16).expect("INVALID_INPUT");
    }
    bytes
}

fn encode_hex<const N: usize>(value: &[u8; N]) -> String {
    let mut result = String::with_capacity(N * 2);
    for byte in value {
        use std::fmt::Write as _;
        write!(&mut result, "{byte:02x}").expect("writing to String cannot fail");
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{VMContextBuilder, accounts};
    use near_sdk::{NearToken, testing_env};

    const KEY: &str = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const ID: &str = "00000000000000000000000000000001";
    const HASH: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const OTHER_HASH: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    fn context(predecessor: AccountId) {
        testing_env!(
            VMContextBuilder::new()
                .current_account_id(accounts(0))
                .signer_account_id(predecessor.clone())
                .predecessor_account_id(predecessor)
                .build()
        );
    }

    fn contract() -> Reference {
        context(accounts(0));
        Reference::init(accounts(1), KEY.to_string())
    }

    fn panic_message<T>(operation: impl FnOnce() -> T) -> String {
        let panic = match std::panic::catch_unwind(std::panic::AssertUnwindSafe(operation)) {
            Ok(_) => panic!("operation should panic"),
            Err(panic) => panic,
        };
        panic
            .downcast_ref::<String>()
            .cloned()
            .or_else(|| {
                panic
                    .downcast_ref::<&str>()
                    .map(|message| (*message).to_string())
            })
            .unwrap_or_default()
    }

    #[test]
    fn init_is_self_only_and_validates_key() {
        context(accounts(1));
        assert!(
            panic_message(|| Reference::init(accounts(1), KEY.to_string())).contains("FORBIDDEN")
        );
        context(accounts(0));
        assert!(
            panic_message(|| Reference::init(accounts(1), "bad".to_string()))
                .contains("INVALID_INPUT")
        );
    }

    #[test]
    fn only_issuer_can_issue_or_revoke() {
        let mut contract = contract();
        testing_env!(
            VMContextBuilder::new()
                .current_account_id(accounts(0))
                .signer_account_id(accounts(1))
                .predecessor_account_id(accounts(2))
                .build()
        );
        assert!(
            panic_message(|| contract.issue(ID.to_string(), HASH.to_string()))
                .contains("FORBIDDEN")
        );
        assert!(panic_message(|| contract.revoke(ID.to_string())).contains("FORBIDDEN"));
    }

    #[test]
    fn issue_is_idempotent_and_conflicts_do_not_overwrite() {
        let mut contract = contract();
        context(accounts(1));
        assert_eq!(contract.issue(ID.to_string(), HASH.to_string()), "ISSUED");
        assert_eq!(
            contract.issue(ID.to_string(), HASH.to_string()),
            "UNCHANGED"
        );
        assert!(
            panic_message(|| contract.issue(ID.to_string(), OTHER_HASH.to_string()))
                .contains("REFERENCE_CONFLICT")
        );
        assert_eq!(contract.issued_count, 1);
    }

    #[test]
    fn revoke_is_permanent_idempotent_and_viewable() {
        let mut contract = contract();
        context(accounts(1));
        contract.issue(ID.to_string(), HASH.to_string());
        assert_eq!(contract.revoke(ID.to_string()), "REVOKED");
        assert_eq!(contract.revoke(ID.to_string()), "UNCHANGED");
        assert!(
            panic_message(|| contract.issue(ID.to_string(), HASH.to_string()))
                .contains("REFERENCE_REVOKED")
        );
        let view = contract.get_reference(ID.to_string());
        assert_eq!(view.issuer_id, accounts(1));
        assert!(view.record.expect("record exists").revoked);
    }

    #[test]
    fn missing_record_and_bad_inputs_are_rejected() {
        let mut contract = contract();
        context(accounts(1));
        assert!(panic_message(|| contract.revoke(ID.to_string())).contains("REFERENCE_NOT_FOUND"));
        assert!(
            panic_message(|| contract.issue("00".to_string(), HASH.to_string()))
                .contains("INVALID_INPUT")
        );
        assert!(
            panic_message(|| contract.issue("é".repeat(16), HASH.to_string()))
                .contains("INVALID_INPUT")
        );
        assert!(
            panic_message(|| contract.issue(ID.to_string(), "GG".repeat(32)))
                .contains("INVALID_INPUT")
        );
    }

    #[test]
    fn nonzero_deposit_is_rejected() {
        let mut contract = contract();
        testing_env!(
            VMContextBuilder::new()
                .current_account_id(accounts(0))
                .signer_account_id(accounts(1))
                .predecessor_account_id(accounts(1))
                .attached_deposit(NearToken::from_yoctonear(1))
                .build()
        );
        assert!(
            panic_message(|| contract.issue(ID.to_string(), HASH.to_string()))
                .contains("INVALID_INPUT")
        );
        assert_eq!(contract.issued_count, 0);
    }

    #[test]
    fn cap_cannot_be_exceeded() {
        let mut contract = contract();
        contract.issued_count = CAP;
        context(accounts(1));
        assert!(
            panic_message(|| contract.issue(ID.to_string(), HASH.to_string()))
                .contains("CAP_REACHED")
        );
    }
}
