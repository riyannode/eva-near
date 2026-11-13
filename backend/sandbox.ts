import { readFile } from "node:fs/promises";
import { Account, KeyPairEd25519, KeyPairSigner, actions, teraToGas } from "near-api-js";
import { GenesisAccount, Sandbox } from "near-sandbox";
import { createEphemeralIssuer, type Issuer } from "./issuer.ts";
import { assertProfile, createProvider } from "./near.ts";
import type { ReferenceProfile } from "./reference.ts";

export interface JudgeRuntime {
  readonly profile: ReferenceProfile;
  readonly publicOrigin: string;
  readonly issuer: Issuer;
  readonly issuerAccount: Account;
  readonly provider: ReturnType<typeof createProvider>;
  close(): Promise<void>;
}

export async function startSandbox(): Promise<JudgeRuntime> {
  const binaryPath = process.env.NEAR_SANDBOX_BIN_PATH;
  if (!binaryPath) throw new Error("SANDBOX_BINARY_NOT_CONFIGURED");
  process.env.NEAR_SANDBOX_BIN_PATH = binaryPath;

  const contractKeys = KeyPairEd25519.fromRandom();
  const issuerTxKeys = KeyPairEd25519.fromRandom();
  const contractId = "reference.sandbox";
  const issuerId = "studio.sandbox";
  const funded = 10_000n * 10n ** 24n;
  let step = "sandbox_start";
  const sandbox = await Sandbox.start({
    version: "2.14.0",
    config: {
      additionalGenesis: { chain_id: "sandbox" },
      additionalAccounts: [
        new GenesisAccount(contractId, contractKeys.publicKey.toString(), contractKeys.secretKey, funded),
        new GenesisAccount(issuerId, issuerTxKeys.publicKey.toString(), issuerTxKeys.secretKey, funded),
      ],
    },
  }).catch(() => {
    process.stdout.write(`${JSON.stringify({ event: "sandbox_bootstrap_failed", step, code: "SANDBOX_START_FAILED" })}\n`);
    throw new Error("SANDBOX_START_FAILED");
  });

  try {
    const profile: ReferenceProfile = { network: "sandbox", contractId, issuerId };
    const publicOrigin = new URL(process.env.APP_ORIGIN ?? "http://127.0.0.1:8080").origin;
    const issuer = await createEphemeralIssuer();
    const provider = createProvider(sandbox.rpcUrl);
    const contractAccount = new Account(contractId, provider, contractKeys.toString());
    const issuerBootstrapAccount = new Account(issuerId, provider, issuerTxKeys.toString());
    const issuerCallKeys = KeyPairEd25519.fromRandom();
    step = "issuer_key_setup";
    const keyOutcome = await issuerBootstrapAccount.signAndSendTransaction({
      receiverId: issuerId,
      actions: [actions.addFunctionCallAccessKey(
        issuerCallKeys.publicKey,
        contractId,
        ["issue", "revoke"],
        1n * 10n ** 24n,
      )],
      waitUntil: "FINAL",
    });
    if (keyOutcome.final_execution_status !== "FINAL" || !isSuccess(keyOutcome.status)) {
      throw new Error("ISSUER_KEY_SETUP_FAILED");
    }
    for (const receipt of keyOutcome.receipts_outcome) {
      if (!isSuccess(receipt.outcome.status)) throw new Error("ISSUER_KEY_SETUP_FAILED");
    }
    const issuerAccount = new Account(issuerId, provider, new KeyPairSigner(issuerCallKeys));
    const wasmPath = process.env.EVA_WASM_PATH ?? new URL("./contract/reference.wasm", import.meta.url).pathname;
    step = "wasm_read";
    const wasm = new Uint8Array(await readFile(wasmPath));
    step = "deploy_init";
    const outcome = await contractAccount.signAndSendTransaction({
      receiverId: contractId,
      actions: [
        actions.deployContract(wasm),
        actions.functionCall("init", { issuer_id: issuerId, issuer_key: issuer.publicKey }, teraToGas("60"), 0n),
      ],
      waitUntil: "FINAL",
    });
    if (outcome.final_execution_status !== "FINAL" || !isSuccess(outcome.status)) {
      process.stdout.write(`${JSON.stringify({ event: "sandbox_bootstrap_failed", step, finalStatus: outcome.final_execution_status, status: statusName(outcome.status) })}\n`);
      throw new Error("SANDBOX_INIT_FAILED");
    }
    for (const receipt of outcome.receipts_outcome) {
      if (!isSuccess(receipt.outcome.status)) {
        process.stdout.write(`${JSON.stringify({ event: "sandbox_bootstrap_failed", step: "deploy_receipt", receiptId: receipt.id, status: statusName(receipt.outcome.status) })}\n`);
        throw new Error("SANDBOX_INIT_FAILED");
      }
    }
    step = "profile_check";
    await assertProfile(provider, profile, issuer.publicKey);
    step = "ready_block";
    const finalView = await provider.viewBlock({ finality: "final" });
    const receipt = {
      transactionHash: outcome.transaction.hash,
      blockHeight: finalView.header.height,
      blockHash: finalView.header.hash,
      receipts: outcome.receipts_outcome.map((entry) => ({
        id: entry.id,
        blockHash: entry.block_hash,
        status: statusName(entry.outcome.status),
      })),
    };
    process.stdout.write(`${JSON.stringify({ event: "sandbox_initialized", network: "Local NEAR Sandbox", ...receipt })}\n`);
    return {
      profile,
      publicOrigin,
      issuer,
      issuerAccount,
      provider,
      close: () => sandbox.tearDown(),
    };
  } catch (error) {
    const code = error instanceof Error && /^[A-Z_]+$/u.test(error.message) ? error.message : "UNAVAILABLE";
    process.stdout.write(`${JSON.stringify({ event: "sandbox_bootstrap_failed", step, code })}\n`);
    await sandbox.tearDown();
    throw error;
  }
}

function isSuccess(status: unknown): boolean {
  if (typeof status === "string") return status === "SuccessValue";
  return typeof status === "object" && status !== null && "SuccessValue" in status;
}

function statusName(status: unknown): string {
  if (typeof status === "string") return status;
  if (typeof status !== "object" || status === null) throw new Error("UNAVAILABLE");
  const [name] = Object.keys(status);
  if (!name) throw new Error("UNAVAILABLE");
  return name;
}
