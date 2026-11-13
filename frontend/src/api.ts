import type { ReferenceProfile, ReferenceRecord } from "@eva/backend/reference";

export interface AppProfile extends ReferenceProfile {
  network: "sandbox" | "testnet";
  issuerLabel: string;
  canIssue: boolean;
}

export async function request(path: string, options?: RequestInit) {
  return fetch(path, { cache: "no-store", ...options, signal: options?.signal ?? AbortSignal.timeout(8000) });
}

export async function getProfile(signal?: AbortSignal): Promise<AppProfile> {
  const response = await request("/api/config", { signal });
  if (!response.ok) throw new Error("UNAVAILABLE");
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || !("network" in value)
    || (value.network !== "sandbox" && value.network !== "testnet")
    || !("contractId" in value) || typeof value.contractId !== "string"
    || !("issuerId" in value) || typeof value.issuerId !== "string"
    || !("issuerLabel" in value) || typeof value.issuerLabel !== "string"
    || !("canIssue" in value) || value.canIssue !== (value.network === "sandbox")) {
    throw new Error("UNAVAILABLE");
  }
  return {
    network: value.network, contractId: value.contractId, issuerId: value.issuerId,
    issuerLabel: value.issuerLabel, canIssue: value.canIssue,
  };
}

export async function getReference(id: string, profile: AppProfile, signal?: AbortSignal): Promise<ReferenceRecord> {
  const response = await request("/api/references/" + id, { signal });
  const value: unknown = await response.json();
  if (!value || typeof value !== "object") throw new Error("UNAVAILABLE");
  if (response.status === 404 && "code" in value && value.code === "REFERENCE_NOT_FOUND") {
    return { issuerId: profile.issuerId, issuerKey: "", record: null };
  }
  if (!response.ok || !("issuerId" in value) || typeof value.issuerId !== "string"
    || !("issuerKey" in value) || typeof value.issuerKey !== "string"
    || !("commitment" in value) || typeof value.commitment !== "string"
    || !("revoked" in value) || typeof value.revoked !== "boolean"
    || !("blockHeight" in value) || typeof value.blockHeight !== "number" || !Number.isSafeInteger(value.blockHeight)
    || !("blockHash" in value) || typeof value.blockHash !== "string" || !value.blockHash) {
    throw new Error("UNAVAILABLE");
  }
  return {
    issuerId: value.issuerId, issuerKey: value.issuerKey,
    record: { commitment: value.commitment, revoked: value.revoked },
    blockHeight: value.blockHeight, blockHash: value.blockHash,
  };
}
