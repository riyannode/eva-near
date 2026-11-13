import { chmod, readFile, writeFile, stat, unlink } from "node:fs/promises";
import { createPublicKey, verify } from "node:crypto";
import { Account, KeyPairSigner } from "near-api-js";
import type { KeyPairString } from "near-api-js";
import { createEnvelope, loadIssuerFromPrivateKey, type ReferenceEnvelope } from "./issuer.ts";
import { assertProfile, createProvider, submitReferenceAction } from "./near.ts";
import { createShareLink, parsePayloadBytes, randomReferenceId, sha256Hex, type ReferenceProfile } from "./reference.ts";

interface PendingFile {
  readonly version: 1;
  readonly envelope: {
    readonly referenceId: string;
    readonly payloadBytes: string;
    readonly signature: string;
    readonly commitment: string;
    readonly link: string;
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function readEnvelope(pending: PendingFile): ReferenceEnvelope {
  const envelope = {
    referenceId: pending.envelope.referenceId,
    payloadBytes: Buffer.from(pending.envelope.payloadBytes, "base64url"),
    signature: Buffer.from(pending.envelope.signature, "base64url"),
    commitment: pending.envelope.commitment,
    link: pending.envelope.link,
  };
  if (Buffer.from(envelope.payloadBytes).toString("base64url") !== pending.envelope.payloadBytes
    || Buffer.from(envelope.signature).toString("base64url") !== pending.envelope.signature) throw new Error("INVALID_INPUT");
  return envelope;
}

async function assertEnvelope(profile: ReferenceProfile, origin: string, issuerKey: string, envelope: ReferenceEnvelope): Promise<void> {
  const payload = parsePayloadBytes(envelope.payloadBytes);
  if (payload.network !== profile.network || payload.contractId !== profile.contractId
    || payload.issuerId !== profile.issuerId || payload.referenceId !== envelope.referenceId
    || await sha256Hex(envelope.payloadBytes) !== envelope.commitment) throw new Error("INVALID_INPUT");
  const rawKey = Buffer.from(issuerKey, "base64url");
  const publicKey = createPublicKey({
    key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), rawKey]),
    format: "der",
    type: "spki",
  });
  if (!verify(null, envelope.payloadBytes, publicKey, envelope.signature)) throw new Error("INVALID_INPUT");
  if (createShareLink(origin, envelope.payloadBytes, envelope.signature) !== envelope.link) throw new Error("INVALID_INPUT");
}

function serializePending(envelope: ReferenceEnvelope): PendingFile {
  return {
    version: 1,
    envelope: {
      referenceId: envelope.referenceId,
      payloadBytes: Buffer.from(envelope.payloadBytes).toString("base64url"),
      signature: Buffer.from(envelope.signature).toString("base64url"),
      commitment: envelope.commitment,
      link: envelope.link,
    },
  };
}

async function writePrivateFile(path: string, contents: string): Promise<void> {
  await writeFile(path, contents, { mode: 0o600, flag: "wx" });
  await chmod(path, 0o600);
}

async function readPrivateJson(path: string): Promise<unknown> {
  const metadata = await stat(path);
  if ((metadata.mode & 0o077) !== 0) throw new Error("KEY_FILE_PERMISSIONS");
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadTxAccount(provider: ReturnType<typeof createProvider>, issuerId: string, contractId: string): Promise<Account> {
  const contents = await readPrivateJson(required("NEAR_TX_KEY_FILE"));
  if (typeof contents !== "object" || contents === null || !("private_key" in contents)
    || typeof contents.private_key !== "string") throw new Error("INVALID_INPUT");
  const signer = KeyPairSigner.fromSecretKey(contents.private_key as KeyPairString);
  const publicKey = await signer.getPublicKey();
  const accessKey = await provider.viewAccessKey({
    accountId: issuerId,
    publicKey,
    finalityQuery: { finality: "final" },
  }).catch(() => {
    throw new Error("FORBIDDEN");
  });
  if (typeof accessKey.permission === "string" || !("FunctionCall" in accessKey.permission)) {
    throw new Error("FORBIDDEN");
  }
  const permission = accessKey.permission.FunctionCall;
  const methods = [...permission.method_names].sort();
  const allowance = permission.allowance === null || permission.allowance === undefined
    ? 0n
    : BigInt(permission.allowance.toString());
  if (permission.receiver_id !== contractId || methods.length !== 2
    || methods[0] !== "issue" || methods[1] !== "revoke" || allowance <= 0n) throw new Error("FORBIDDEN");
  return new Account(issuerId, provider, signer);
}

function profileFromEnv(): { profile: ReferenceProfile; rpcUrl: string; origin: string } {
  const contractId = required("NEAR_CONTRACT_ID");
  const issuerId = required("NEAR_ISSUER_ID");
  const origin = new URL(required("PUBLIC_ORIGIN"));
  const rpc = new URL(required("NEAR_RPC_URL"));
  if (origin.protocol !== "https:" || rpc.protocol !== "https:") throw new Error("INVALID_INPUT");
  return { profile: { network: "testnet", contractId, issuerId }, rpcUrl: rpc.href, origin: origin.origin };
}

async function issue(requestPath: string, pendingPath: string, outputPath: string): Promise<void> {
  const { profile, rpcUrl, origin } = profileFromEnv();
  const issuer = await loadIssuerFromPrivateKey(required("ISSUER_KEY_FILE"));
  const provider = createProvider(rpcUrl);
  await assertProfile(provider, profile, issuer.publicKey);
  const value: unknown = JSON.parse(await readFile(requestPath, "utf8"));
  if (typeof value !== "object" || value === null || !("approved" in value) || value.approved !== true
    || !("subject" in value) || typeof value.subject !== "string"
    || !("claim" in value) || typeof value.claim !== "string"
    || Object.keys(value).length !== 3) throw new Error("INVALID_INPUT");
  const txAccount = await loadTxAccount(provider, profile.issuerId, profile.contractId);
  const envelope = await createEnvelope(profile, origin, issuer, {
    referenceId: randomReferenceId(),
    subject: value.subject,
    claim: value.claim,
  });
  await writePrivateFile(pendingPath, JSON.stringify(serializePending(envelope)));
  const result = await submitReferenceAction(provider, txAccount, profile.contractId, {
    action: "issue",
    referenceId: envelope.referenceId,
    commitment: envelope.commitment,
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "SUBMISSION_PENDING") throw new Error("ISSUE_PENDING");
    throw error;
  });
  const view = result.finalView;
  if (!view.record || view.record.commitment !== envelope.commitment || view.record.revoked) throw new Error("ISSUE_PENDING");
  if (result.evidence) process.stdout.write(`${JSON.stringify({ event: "reference_transaction", ...result.evidence })}\n`);
  await writePrivateFile(outputPath, `${envelope.link}\n`);
  await unlink(pendingPath);
  process.stdout.write(`${JSON.stringify({ status: "ISSUED", referenceId: envelope.referenceId, output: outputPath })}\n`);
}

async function resume(pendingPath: string, outputPath: string): Promise<void> {
  const { profile, rpcUrl } = profileFromEnv();
  const issuer = await loadIssuerFromPrivateKey(required("ISSUER_KEY_FILE"));
  const provider = createProvider(rpcUrl);
  await assertProfile(provider, profile, issuer.publicKey);
  const pendingMetadata = await stat(pendingPath);
  if ((pendingMetadata.mode & 0o077) !== 0) throw new Error("KEY_FILE_PERMISSIONS");
  const value: unknown = JSON.parse(await readFile(pendingPath, "utf8"));
  if (typeof value !== "object" || value === null || !("version" in value) || value.version !== 1
    || !("envelope" in value) || typeof value.envelope !== "object" || value.envelope === null) throw new Error("INVALID_INPUT");
  const pending = value as PendingFile;
  const envelope = readEnvelope(pending);
  const { origin } = profileFromEnv();
  await assertEnvelope(profile, origin, issuer.publicKey, envelope);
  const txAccount = await loadTxAccount(provider, profile.issuerId, profile.contractId);
  const result = await submitReferenceAction(provider, txAccount, profile.contractId, {
    action: "issue",
    referenceId: envelope.referenceId,
    commitment: envelope.commitment,
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "SUBMISSION_PENDING") throw new Error("ISSUE_PENDING");
    throw error;
  });
  const view = result.finalView;
  if (!view.record || view.record.commitment !== envelope.commitment || view.record.revoked) throw new Error("ISSUE_PENDING");
  if (result.evidence) process.stdout.write(`${JSON.stringify({ event: "reference_transaction", ...result.evidence })}\n`);
  await writePrivateFile(outputPath, `${envelope.link}\n`);
  process.stdout.write(`${JSON.stringify({ status: "ISSUED", referenceId: envelope.referenceId, output: outputPath })}\n`);
}

async function revoke(referenceId: string): Promise<void> {
  const { profile, rpcUrl } = profileFromEnv();
  if (!/^[a-f0-9]{32}$/u.test(referenceId)) throw new Error("INVALID_INPUT");
  const provider = createProvider(rpcUrl);
  await assertProfile(provider, profile);
  const txAccount = await loadTxAccount(provider, profile.issuerId, profile.contractId);
  const result = await submitReferenceAction(provider, txAccount, profile.contractId, { action: "revoke", referenceId }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "SUBMISSION_PENDING") throw new Error("REVOKE_PENDING");
    throw error;
  });
  const view = result.finalView;
  if (!view.record?.revoked) throw new Error("REVOKE_PENDING");
  if (result.evidence) process.stdout.write(`${JSON.stringify({ event: "reference_transaction", ...result.evidence })}\n`);
  process.stdout.write(`${JSON.stringify({ status: "REVOKED", referenceId, blockHeight: view.blockHeight, blockHash: view.blockHash })}\n`);
}

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;
  if (command === "issue" && args.length === 2) return issue(args[0], `${args[1]}.pending`, args[1]);
  if (command === "resume" && args.length === 2) return resume(args[0], args[1]);
  if (command === "revoke" && args.length === 1) return revoke(args[0]);
  throw new Error("Usage: reference issue <request-file> <output-file> | resume <pending-file> <output-file> | revoke <reference-id>");
}

void main().catch((error: unknown) => {
  const code = error instanceof Error && /^[A-Z_]+$/u.test(error.message) ? error.message : "UNAVAILABLE";
  process.stderr.write(`${JSON.stringify({ code })}\n`);
  process.exitCode = 1;
});
