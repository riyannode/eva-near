import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { createShareLink, createPayload, encodePayload, randomSalt, sha256Hex, type ReferenceProfile } from "./reference.ts";

export interface Issuer {
  readonly publicKey: string;
  sign(payloadBytes: Uint8Array): Uint8Array;
}

export interface ReferenceEnvelope {
  readonly referenceId: string;
  readonly payloadBytes: Uint8Array;
  readonly signature: Uint8Array;
  readonly commitment: string;
  readonly link: string;
}

function issuerFromPrivateKey(privateKey: KeyObject): Issuer {
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("INVALID_INPUT");
  const publicKey = createPublicKey({
    key: privateKey.export({ format: "pem", type: "pkcs8" }),
    format: "pem",
  }).export({ format: "der", type: "spki" });
  const rawKey = publicKey.subarray(-32);
  return {
    publicKey: rawKey.toString("base64url"),
    sign: (payloadBytes) => new Uint8Array(sign(null, payloadBytes, privateKey)),
  };
}

export async function createEphemeralIssuer(): Promise<Issuer> {
  const { privateKey } = generateKeyPairSync("ed25519");
  return issuerFromPrivateKey(privateKey);
}

export async function loadIssuerFromPrivateKey(path: string): Promise<Issuer> {
  const [keyBytes, metadata] = await Promise.all([readFile(path), stat(path)]);
  if ((metadata.mode & 0o077) !== 0) throw new Error("ISSUER_KEY_PERMISSIONS");
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey({ key: keyBytes, format: "pem", type: "pkcs8" });
  } catch {
    throw new Error("INVALID_INPUT");
  }
  return issuerFromPrivateKey(privateKey);
}

export async function createEnvelope(
  profile: ReferenceProfile,
  origin: string,
  issuer: Issuer,
  input: { readonly referenceId: string; readonly subject: string; readonly claim: string },
): Promise<ReferenceEnvelope> {
  const payload = createPayload(profile, { ...input, salt: randomSalt() });
  const payloadBytes = encodePayload(payload);
  const signature = issuer.sign(payloadBytes);
  return {
    referenceId: input.referenceId,
    payloadBytes,
    signature,
    commitment: await sha256Hex(payloadBytes),
    link: createShareLink(origin, payloadBytes, signature),
  };
}
