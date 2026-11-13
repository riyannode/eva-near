export type Network = "sample" | "sandbox" | "testnet";

export interface ReferencePayload {
  readonly version: "eva:reference:v1";
  readonly network: Network;
  readonly contractId: string;
  readonly issuerId: string;
  readonly referenceId: string;
  readonly salt: string;
  readonly subject: string;
  readonly claim: string;
}

export interface ReferenceProfile {
  readonly network: Network;
  readonly contractId: string;
  readonly issuerId: string;
}

export interface ReferenceRecord {
  readonly issuerId: string;
  readonly issuerKey: string;
  readonly record: null | {
    readonly commitment: string;
    readonly revoked: boolean;
  };
  readonly blockHeight?: number;
  readonly blockHash?: string;
}

export interface ParsedLink {
  readonly payload: ReferencePayload;
  readonly payloadBytes: Uint8Array;
  readonly signature: Uint8Array;
}

export type Verification =
  | { readonly status: "VALID" | "REVOKED"; readonly record: ReferenceRecord }
  | { readonly status: "INVALID"; readonly code: string }
  | { readonly status: "UNAVAILABLE"; readonly code: "UNAVAILABLE" };

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const directional = /[\u061C\u200E\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069]/u;
const controls = /\p{Cc}/u;

export function normalizeTextInput(value: string, maxBytes: number): string {
  if (!value.isWellFormed() || controls.test(value) || directional.test(value)) throw new Error("INVALID_INPUT");
  const normalized = value.normalize("NFC").trim();
  validateText(normalized, maxBytes);
  return normalized;
}

function validateText(value: string, maxBytes: number): void {
  if (value !== value.normalize("NFC") || value !== value.trim() || controls.test(value) || directional.test(value)) {
    throw new Error("INVALID_INPUT");
  }
  if (!value.isWellFormed()) throw new Error("INVALID_INPUT");
  const size = encoder.encode(value).byteLength;
  if (size < 1 || size > maxBytes) throw new Error("INVALID_INPUT");
}

function isAccountId(value: string): boolean {
  return value.length >= 2 && value.length <= 64 && /^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\.[a-z0-9]+(?:[-_][a-z0-9]+)*)*$/u.test(value);
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function decodeBase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) throw new Error("INVALID_LINK");
  const normalized = value.replace(/-/gu, "+").replace(/_/gu, "/");
  const bytes = Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
  if (base64url(bytes) !== value) throw new Error("INVALID_LINK");
  return bytes;
}

function assertPayload(payload: ReferencePayload): void {
  if (payload.version !== "eva:reference:v1" || !["sample", "sandbox", "testnet"].includes(payload.network)) {
    throw new Error("INVALID_LINK");
  }
  if (!isAccountId(payload.contractId) || !isAccountId(payload.issuerId)) throw new Error("INVALID_LINK");
  if (!/^[a-f0-9]{32}$/u.test(payload.referenceId) || !/^[A-Za-z0-9_-]{43}$/u.test(payload.salt)) {
    throw new Error("INVALID_LINK");
  }
  if (decodeBase64url(payload.salt).byteLength !== 32) throw new Error("INVALID_LINK");
  validateText(payload.subject, 80);
  validateText(payload.claim, 240);
}

export function createPayload(
  profile: ReferenceProfile,
  fields: { readonly referenceId: string; readonly salt: string; readonly subject: string; readonly claim: string },
): ReferencePayload {
  const payload: ReferencePayload = {
    version: "eva:reference:v1",
    ...profile,
    referenceId: fields.referenceId,
    salt: fields.salt,
    subject: normalizeTextInput(fields.subject, 80),
    claim: normalizeTextInput(fields.claim, 240),
  };
  assertPayload(payload);
  return payload;
}

export function encodePayload(payload: ReferencePayload): Uint8Array {
  assertPayload(payload);
  return encoder.encode(JSON.stringify([
    payload.version,
    payload.network,
    payload.contractId,
    payload.issuerId,
    payload.referenceId,
    payload.salt,
    payload.subject,
    payload.claim,
  ]));
}

export function parsePayloadBytes(bytes: Uint8Array): ReferencePayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(bytes));
  } catch {
    throw new Error("INVALID_LINK");
  }
  if (!Array.isArray(parsed) || parsed.length !== 8 || !parsed.every((value) => typeof value === "string")) {
    throw new Error("INVALID_LINK");
  }
  const payload: ReferencePayload = {
    version: parsed[0] as ReferencePayload["version"],
    network: parsed[1] as Network,
    contractId: parsed[2] as string,
    issuerId: parsed[3] as string,
    referenceId: parsed[4] as string,
    salt: parsed[5] as string,
    subject: parsed[6] as string,
    claim: parsed[7] as string,
  };
  assertPayload(payload);
  const canonical = encodePayload(payload);
  if (!equalBytes(canonical, bytes)) throw new Error("INVALID_LINK");
  return payload;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

export function parseLinkFragment(fragment: string): ParsedLink {
  if (fragment.length < 4 || fragment.length > 2051 || !fragment.startsWith("#r=")) throw new Error("INVALID_LINK");
  const encoded = fragment.slice(3);
  if (encoded.length > 2048 || encoded.split(".").length !== 2) throw new Error("INVALID_LINK");
  const [payload64, signature64] = encoded.split(".");
  const payloadBytes = decodeBase64url(payload64);
  const signature = decodeBase64url(signature64);
  if (signature.byteLength !== 64) throw new Error("INVALID_LINK");
  return { payload: parsePayloadBytes(payloadBytes), payloadBytes, signature };
}

export function createShareLink(origin: string, payloadBytes: Uint8Array, signature: Uint8Array): string {
  if (signature.byteLength !== 64) throw new Error("INVALID_INPUT");
  const encoded = `${base64url(payloadBytes)}.${base64url(signature)}`;
  if (encoded.length > 2048) throw new Error("INVALID_INPUT");
  return `${origin}/verify#r=${encoded}`;
}

export function randomReferenceId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomSalt(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyReference(
  link: ParsedLink,
  expected: ReferenceProfile,
  readStatus: (referenceId: string) => Promise<ReferenceRecord>,
): Promise<Verification> {
  const { payload, payloadBytes, signature } = link;
  if (payload.network !== expected.network || payload.contractId !== expected.contractId || payload.issuerId !== expected.issuerId) {
    return { status: "INVALID", code: "PROFILE_MISMATCH" };
  }
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    return { status: "UNAVAILABLE", code: "UNAVAILABLE" };
  }
  let record: ReferenceRecord;
  try {
    record = await readStatus(payload.referenceId);
  } catch {
    return { status: "UNAVAILABLE", code: "UNAVAILABLE" };
  }
  if (record.issuerId !== expected.issuerId) {
    return { status: "UNAVAILABLE", code: "UNAVAILABLE" };
  }
  if (!record.record) return { status: "INVALID", code: "REFERENCE_NOT_FOUND" };
  if (!/^[A-Za-z0-9_-]{43}$/u.test(record.issuerKey)) return { status: "UNAVAILABLE", code: "UNAVAILABLE" };
  let validSignature: boolean;
  try {
    const keyBytes = decodeBase64url(record.issuerKey);
    if (keyBytes.byteLength !== 32) return { status: "UNAVAILABLE", code: "UNAVAILABLE" };
    const key = await crypto.subtle.importKey("raw", Uint8Array.from(keyBytes), { name: "Ed25519" }, false, ["verify"]);
    validSignature = await crypto.subtle.verify({ name: "Ed25519" }, key, Uint8Array.from(signature), Uint8Array.from(payloadBytes));
  } catch {
    return { status: "UNAVAILABLE", code: "UNAVAILABLE" };
  }
  if (!validSignature) return { status: "INVALID", code: "SIGNATURE_INVALID" };
  if (!/^[a-f0-9]{64}$/u.test(record.record.commitment)) return { status: "UNAVAILABLE", code: "UNAVAILABLE" };
  try {
    if (await sha256Hex(payloadBytes) !== record.record.commitment) {
      return { status: "INVALID", code: "COMMITMENT_MISMATCH" };
    }
  } catch {
    return { status: "UNAVAILABLE", code: "UNAVAILABLE" };
  }
  return { status: record.record.revoked ? "REVOKED" : "VALID", record };
}
