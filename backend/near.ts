import { Account, JsonRpcProvider, teraToGas } from "near-api-js";
import type { ReferenceProfile } from "./reference.ts";

export interface RawReferenceView {
  readonly issuerId: string;
  readonly issuerKey: string;
  readonly record: null | { readonly commitment: string; readonly revoked: boolean };
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

export interface ActionResult {
  readonly evidence: TransactionEvidence | null;
  readonly finalView: RawReferenceView;
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
  if (!isObject(value) || typeof value.issuer_id !== "string" || typeof value.issuer_key !== "string") {
    throw new Error("UNAVAILABLE");
  }
  if (!Number.isSafeInteger(blockHeight) || blockHeight < 0
    || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u.test(blockHash)
    || !/^[A-Za-z0-9_-]{43}$/u.test(value.issuer_key)
    || Buffer.from(value.issuer_key, "base64url").byteLength !== 32
    || Buffer.from(value.issuer_key, "base64url").toString("base64url") !== value.issuer_key) {
    throw new Error("UNAVAILABLE");
  }
  const rawRecord = value.record;
  let record: RawReferenceView["record"];
  if (rawRecord === null) {
    record = null;
  } else {
    if (!isObject(rawRecord) || typeof rawRecord.commitment !== "string" || typeof rawRecord.revoked !== "boolean"
      || !/^[a-f0-9]{64}$/u.test(rawRecord.commitment)) throw new Error("UNAVAILABLE");
    record = { commitment: rawRecord.commitment, revoked: rawRecord.revoked };
  }
  return {
    issuerId: value.issuer_id,
    issuerKey: value.issuer_key,
    record,
    blockHeight,
    blockHash,
  };
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

export async function assertProfile(provider: JsonRpcProvider, profile: ReferenceProfile, expectedIssuerKey?: string): Promise<void> {
  if (await provider.getNetworkId() !== profile.network) throw new Error("UNAVAILABLE");
  const view = await readReference(provider, profile.contractId, "00000000000000000000000000000000");
  if (view.issuerId !== profile.issuerId || !/^[A-Za-z0-9_-]{43}$/u.test(view.issuerKey)) throw new Error("UNAVAILABLE");
  if (expectedIssuerKey && view.issuerKey !== expectedIssuerKey) throw new Error("UNAVAILABLE");
}

export type ReferenceAction =
  | { readonly action: "issue"; readonly referenceId: string; readonly commitment: string }
  | { readonly action: "revoke"; readonly referenceId: string };

function knownFailure(error: unknown): string | undefined {
  const text = error instanceof Error ? error.message : JSON.stringify(error);
  return ["REFERENCE_CONFLICT", "REFERENCE_REVOKED", "REFERENCE_NOT_FOUND", "CAP_REACHED", "FORBIDDEN", "INVALID_INPUT"]
    .find((code) => text.includes(code));
}

export async function submitReferenceAction(
  provider: JsonRpcProvider,
  issuerAccount: Account,
  contractId: string,
  input: ReferenceAction,
): Promise<ActionResult> {
  let current: RawReferenceView;
  try {
    current = await readReference(provider, contractId, input.referenceId);
  } catch {
    throw new Error("UNAVAILABLE");
  }
  if (input.action === "issue" && current.record) {
    if (current.record.revoked) throw new Error("REFERENCE_REVOKED");
    if (current.record.commitment !== input.commitment) throw new Error("REFERENCE_CONFLICT");
    return { evidence: null, finalView: current };
  }
  if (input.action === "revoke" && !current.record) throw new Error("REFERENCE_NOT_FOUND");
  if (input.action === "revoke" && current.record?.revoked) return { evidence: null, finalView: current };
  const methodName = input.action;
  const args = input.action === "issue"
    ? { reference_id: input.referenceId, commitment: input.commitment }
    : { reference_id: input.referenceId };
  const outcome = await issuerAccount.callFunctionRaw({
    contractId,
    methodName,
    args,
    deposit: 0n,
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
    if (confirmed.record.commitment !== input.commitment) throw new Error("REFERENCE_CONFLICT");
    if (confirmed.record.revoked) throw new Error("REFERENCE_REVOKED");
  } else if (!confirmed.record?.revoked) {
    if (!confirmed.record) throw new Error("REFERENCE_NOT_FOUND");
    throw new Error("SUBMISSION_PENDING");
  }
  return {
    evidence: {
      transactionHash: outcome.transaction.hash,
      blockHeight: confirmed.blockHeight,
      blockHash: confirmed.blockHash,
      receipts,
      action: input.action,
      referenceId: input.referenceId,
      ...(input.action === "issue" ? { commitment: input.commitment } : {}),
    },
    finalView: confirmed,
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
