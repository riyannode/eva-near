import { isAccountId, type ReferenceProfile, type ReferenceRecord } from "@eva/backend/reference";

export interface AppProfile extends Omit<ReferenceProfile, "issuerId"> {
  network: "sandbox" | "testnet";
  canIssue: boolean;
}

export async function request(path: string, options?: RequestInit) {
  return fetch(path, { cache: "no-store", ...options, signal: AbortSignal.any([AbortSignal.timeout(8000), ...(options?.signal ? [options.signal] : [])]) });
}

export async function getProfile(signal?: AbortSignal): Promise<AppProfile> {
  const response = await request("/api/config", { signal });
  if (!response.ok) throw new Error("UNAVAILABLE");
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || !("network" in value)
    || (value.network !== "sandbox" && value.network !== "testnet")
    || !("contractId" in value) || (typeof value.contractId !== "string" || !isAccountId(value.contractId))
    || !("canIssue" in value) || value.canIssue !== (value.network === "sandbox")) {
    throw new Error("UNAVAILABLE");
  }
  return {
    network: value.network, contractId: value.contractId,
    canIssue: value.canIssue,
  };
}

export async function getReference(id: string, signal?: AbortSignal): Promise<ReferenceRecord> {
  const response = await request("/api/references/" + id, { signal });
  const value: unknown = await response.json();
  if (!value || typeof value !== "object") throw new Error("UNAVAILABLE");
  if (response.status === 404 && "code" in value && value.code === "REFERENCE_NOT_FOUND") {
    return { record: null };
  }
  if (!response.ok || !("issuerId" in value) || (typeof value.issuerId !== "string" || !isAccountId(value.issuerId))
    || !("commitment" in value) || typeof value.commitment !== "string"
    || !("revoked" in value) || typeof value.revoked !== "boolean"
    || !("blockHeight" in value) || typeof value.blockHeight !== "number" || !Number.isSafeInteger(value.blockHeight) || value.blockHeight < 0
    || !("blockHash" in value) || typeof value.blockHash !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u.test(value.blockHash)) {
    throw new Error("UNAVAILABLE");
  }
  return {
    record: { issuerId: value.issuerId, commitment: value.commitment, revoked: value.revoked },
    blockHeight: value.blockHeight, blockHash: value.blockHash,
  };
}
