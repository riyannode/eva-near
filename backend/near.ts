import { Account, JsonRpcProvider, teraToGas } from "near-api-js";
import { isAccountId, type ReferenceProfile } from "./reference.ts";

export interface RawReferenceView {
  readonly record: null | { readonly issuerId: string; readonly commitment: string; readonly revoked: boolean };
  readonly blockHeight: number;
  readonly blockHash: string;
}

export interface ReceiptEvidence {
  readonly id: string;
  readonly blockHash: string;
  readonly status: string;
}

export interface TransactionEvidence {
  readonly transactionHash: string;
  readonly blockHeight: number;
  readonly blockHash: string;
  readonly receipts: readonly ReceiptEvidence[];
  readonly action: "issue" | "revoke";
  readonly referenceId: string;
  readonly commitment?: string;
}

const RPC_TIMEOUT_MS = 7_500;
let deadlineFetchInstalled = false;

function installRpcDeadline(): void {
  if (deadlineFetchInstalled) return;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("RPC_TIMEOUT")), RPC_TIMEOUT_MS);
    try {
      const response = await originalFetch(input, { ...init, signal: controller.signal });
      const body = await response.arrayBuffer();
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    } finally {
      clearTimeout(timer);
    }
  };
  deadlineFetchInstalled = true;
}

export function createProvider(rpcUrl: string): JsonRpcProvider {
  installRpcDeadline();
  return new JsonRpcProvider({ url: rpcUrl }, { retries: 1, wait: 100, backoff: 1 });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseView(value: unknown, blockHeight: number, blockHash: string): RawReferenceView {
  if (!Number.isSafeInteger(blockHeight) || blockHeight < 0 || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u.test(blockHash)) throw new Error("UNAVAILABLE");
  let record: RawReferenceView["record"] = null;
  if (value !== null) {
    if (!isObject(value) || (typeof value.issuer_id !== "string" || !isAccountId(value.issuer_id)) || typeof value.commitment !== "string" || typeof value.revoked !== "boolean" || !/^[a-f0-9]{64}$/u.test(value.commitment)) throw new Error("UNAVAILABLE");
    record = { issuerId: value.issuer_id, commitment: value.commitment, revoked: value.revoked };
  }
  return { record, blockHeight, blockHash };
}

export async function readReference(
  provider: JsonRpcProvider,
  contractId: string,
  referenceId: string,
): Promise<RawReferenceView> {
  const result = await provider.callFunctionRaw({
    contractId,
    method: "get_reference",
    args: { reference_id: referenceId },
    blockQuery: { finality: "final" },
  });
  if (!Number.isSafeInteger(result.block_height) || typeof result.block_hash !== "string") throw new Error("UNAVAILABLE");
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(result.result)));
  } catch {
    throw new Error("UNAVAILABLE");
  }
  return parseView(value, result.block_height, result.block_hash);
}

export async function assertProfile(provider: JsonRpcProvider, profile: Pick<ReferenceProfile, "network" | "contractId">): Promise<void> {
  if (await provider.getNetworkId() !== profile.network) throw new Error("UNAVAILABLE");
  await readReference(provider, profile.contractId, "00000000000000000000000000000000");
}

export type ReferenceAction =
  | { readonly action: "issue"; readonly referenceId: string; readonly commitment: string }
  | { readonly action: "revoke"; readonly referenceId: string };

function knownFailure(error: unknown): string | undefined {
  const text = error instanceof Error ? error.message : JSON.stringify(error);
  return ["REFERENCE_CONFLICT", "REFERENCE_REVOKED", "REFERENCE_NOT_FOUND", "INSUFFICIENT_DEPOSIT", "FORBIDDEN", "INVALID_INPUT"]
    .find((code) => text?.includes(code));
}

export async function submitReferenceAction(
  provider: JsonRpcProvider,
  issuerAccount: Account,
  contractId: string,
  input: ReferenceAction,
): Promise<TransactionEvidence | null> {
  let current: RawReferenceView;
  try {
    current = await readReference(provider, contractId, input.referenceId);
  } catch {
    throw new Error("UNAVAILABLE");
  }
  if (input.action === "issue" && current.record) {
    if (current.record.revoked) throw new Error("REFERENCE_REVOKED");
    if (current.record.issuerId !== issuerAccount.accountId || current.record.commitment !== input.commitment) throw new Error("REFERENCE_CONFLICT");
    return null;
  }
  if (input.action === "revoke") {
    if (!current.record) throw new Error("REFERENCE_NOT_FOUND");
    if (current.record.issuerId !== issuerAccount.accountId) throw new Error("FORBIDDEN");
    if (current.record.revoked) return null;
  }
  const methodName = input.action;
  const args = input.action === "issue"
    ? { reference_id: input.referenceId, commitment: input.commitment }
    : { reference_id: input.referenceId };
  const outcome = await issuerAccount.callFunctionRaw({
    contractId,
    methodName,
    args,
    deposit: input.action === "issue" ? 10n ** 22n : 0n,
    gas: teraToGas("60"),
    waitUntil: "FINAL",
  }).catch((error: unknown) => {
    const code = knownFailure(error);
    if (code) throw new Error(code);
    throw new Error("SUBMISSION_PENDING");
  });
  if (outcome.final_execution_status !== "FINAL" || !successful(outcome.status)) {
    const code = knownFailure(outcome.status);
    if (code) throw new Error(code);
    throw new Error("TRANSACTION_FAILED");
  }
  const receipts = outcome.receipts_outcome.map((receipt) => {
    if (!successful(receipt.outcome.status)) {
      const code = knownFailure(receipt.outcome.status);
      if (code) throw new Error(code);
      throw new Error("TRANSACTION_FAILED");
    }
    return {
      id: receipt.id,
      blockHash: receipt.block_hash,
      status: statusName(receipt.outcome.status),
    };
  });
  let confirmed: RawReferenceView;
  try {
    confirmed = await readReference(provider, contractId, input.referenceId);
  } catch {
    throw new Error("SUBMISSION_PENDING");
  }
  if (input.action === "issue") {
    if (!confirmed.record) throw new Error("SUBMISSION_PENDING");
    if (confirmed.record.issuerId !== issuerAccount.accountId || confirmed.record.commitment !== input.commitment) throw new Error("REFERENCE_CONFLICT");
    if (confirmed.record.revoked) throw new Error("REFERENCE_REVOKED");
  } else {
    if (!confirmed.record) throw new Error("REFERENCE_NOT_FOUND");
    if (confirmed.record.issuerId !== issuerAccount.accountId) throw new Error("FORBIDDEN");
    if (!confirmed.record.revoked) throw new Error("SUBMISSION_PENDING");
  }
  return {
    transactionHash: outcome.transaction.hash,
    blockHeight: confirmed.blockHeight,
    blockHash: confirmed.blockHash,
    receipts,
    action: input.action,
    referenceId: input.referenceId,
    ...(input.action === "issue" ? { commitment: input.commitment } : {}),
  };
}

function successful(status: unknown): boolean {
  if (typeof status === "string") return status === "SuccessValue";
  return isObject(status) && "SuccessValue" in status;
}

function statusName(status: unknown): string {
  if (typeof status === "string") return status;
  if (!isObject(status)) throw new Error("UNAVAILABLE");
  const [name] = Object.keys(status);
  if (!name) throw new Error("UNAVAILABLE");
  return name;
}
