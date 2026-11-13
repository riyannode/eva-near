import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { JsonRpcProvider } from "near-api-js";
import { readReference } from "./near.ts";
import {
  createPayload,
  encodePayload,
  normalizeTextInput,
  parseLinkFragment,
  parsePayloadBytes,
  sha256Hex,
  verifyReference,
} from "./reference.ts";

const profile = {
  network: "sample" as const,
  contractId: "registry.sample",
  issuerId: "studio.sample",
};
const payload = createPayload(profile, {
  referenceId: "00112233445566778899aabbccddeeff",
  salt: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
  subject: "Zoë 李",
  claim: "Designed the checkout flow for an e-commerce project.",
});
const payloadBytes = encodePayload(payload);

test("canonical Unicode vector has stable UTF-8 bytes", () => {
  assert.equal(
    new TextDecoder().decode(payloadBytes),
    '["eva:reference:v1","sample","registry.sample","studio.sample","00112233445566778899aabbccddeeff","AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE","Zoë 李","Designed the checkout flow for an e-commerce project."]',
  );
  assert.deepEqual(encodePayload(parsePayloadBytes(payloadBytes)), payloadBytes);
});

test("parser rejects noncanonical and malformed UTF-8 payloads", () => {
  assert.throws(() => parsePayloadBytes(new TextEncoder().encode(new TextDecoder().decode(payloadBytes).replace(",\"sample\"", ", \"sample\""))));
  assert.throws(() => parsePayloadBytes(Uint8Array.of(0xff, 0xfe)));
  assert.throws(() => parsePayloadBytes(new TextEncoder().encode(JSON.stringify(["eva:reference:v1", "sample", "registry.sample", "studio.sample", "00", "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE", "A", "B"]))));
});

test("text input normalizes Unicode and rejects controls, directions, and malformed surrogates", () => {
  assert.equal(normalizeTextInput("  Cafe\u0301  ", 80), "Café");
  for (const invalid of ["\nAlex", "Alex\u2028Morgan", "Alex\u202eMorgan", "\ud800"]) {
    assert.throws(() => normalizeTextInput(invalid, 80));
  }
});

test("fragment parser requires one canonical reference package", () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  const signature = sign(null, payloadBytes, privateKey);
  const link = `#r=${Buffer.from(payloadBytes).toString("base64url")}.${signature.toString("base64url")}`;
  assert.deepEqual(parseLinkFragment(link).payload, payload);
  assert.throws(() => parseLinkFragment(`${link}.extra`));
  assert.throws(() => parseLinkFragment(link.replace("#r=", "#r=x")));
});

test("verification requires profile, issuer signature, commitment, and final active record", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const issuerKey = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64url");
  const signature = new Uint8Array(sign(null, payloadBytes, privateKey));
  const parsed = { payload, payloadBytes, signature };
  const commitment = await sha256Hex(payloadBytes);
  let requests = 0;
  const readStatus = async (referenceId: string) => {
    requests += 1;
    assert.equal(referenceId, payload.referenceId);
    return { issuerId: profile.issuerId, issuerKey, record: { commitment, revoked: false } };
  };
  assert.equal((await verifyReference(parsed, profile, readStatus)).status, "VALID");
  assert.equal(requests, 1);
  assert.equal((await verifyReference(parsed, { ...profile, network: "testnet" }, readStatus)).status, "INVALID");
  assert.equal((await verifyReference(parsed, profile, async () => ({ issuerId: profile.issuerId, issuerKey: "", record: null }))).status, "INVALID");
  assert.equal((await verifyReference(parsed, profile, async () => ({
    issuerId: profile.issuerId,
    issuerKey,
    record: { commitment, revoked: true },
  }))).status, "REVOKED");
  assert.equal((await verifyReference({ ...parsed, signature: new Uint8Array(64) }, profile, readStatus)).status, "INVALID");
  assert.equal((await verifyReference(parsed, profile, async () => { throw new Error("offline"); })).status, "UNAVAILABLE");
});

test("final RPC accepts a valid 43-character base58 block hash", async context => {
  const blockHash = "5z16PysFd3q5YCGxDSzBBfzz2Hm9ifyb7N5ge1rDPyjP";
  const provider = new JsonRpcProvider({ url: "http://127.0.0.1:1" });
  const call = context.mock.method(provider, "callFunctionRaw", async (args: Parameters<JsonRpcProvider["callFunctionRaw"]>[0]) => {
    assert.deepEqual(args.blockQuery, { finality: "final" });
    return {
      block_hash: blockHash,
      block_height: 328,
      logs: [],
      result: [...new TextEncoder().encode(JSON.stringify({
        issuer_id: profile.issuerId, issuer_key: "A".repeat(43), record: null,
      }))],
    };
  });
  const result = await readReference(provider, profile.contractId, payload.referenceId);
  assert.equal(result.blockHash, blockHash);
  assert.equal(call.mock.callCount(), 1);
});