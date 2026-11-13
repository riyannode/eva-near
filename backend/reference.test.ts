import assert from "node:assert/strict";
import test from "node:test";
import { createPayload, createShareLink, encodePayload, normalizeTextInput, parseLinkFragment, parsePayloadBytes, sha256Hex, verifyReference } from "./reference.ts";

const profile = { network: "sample", contractId: "registry.sample", issuerId: "studio.sample" } as const;
const payload = createPayload(profile, { referenceId: "00112233445566778899aabbccddeeff", salt: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE", subject: "Zoë 李", claim: "Designed the checkout flow for an e-commerce project." });
const bytes = encodePayload(payload);

test("canonical Unicode vector and strict parser", () => {
  assert.equal(new TextDecoder().decode(bytes), '["eva:reference:v2","sample","registry.sample","studio.sample","00112233445566778899aabbccddeeff","AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE","Zoë 李","Designed the checkout flow for an e-commerce project."]');
  assert.deepEqual(parsePayloadBytes(bytes), payload);
  assert.throws(() => parsePayloadBytes(new TextEncoder().encode(new TextDecoder().decode(bytes).replace(',"sample"', ', "sample"'))));
  assert.throws(() => parsePayloadBytes(Uint8Array.of(255)));
  assert.equal(normalizeTextInput("  Cafe\u0301  ", 80), "Café");
  for (const invalid of ["\nAlex", "Alex\u2028Morgan", "Alex\u202eMorgan", "\ud800"]) assert.throws(() => normalizeTextInput(invalid, 80));
  const fragment = new URL(createShareLink("https://example.invalid", bytes)).hash;
  assert.deepEqual(parseLinkFragment(fragment).payload, payload);
  assert.throws(() => parseLinkFragment(fragment + ".extra"));
  assert.throws(() => parseLinkFragment(fragment + "="));
  const obsolete = new TextDecoder().decode(bytes).replace("eva:reference:v2", "eva:reference:v1");
  assert.throws(() => parseLinkFragment("#r=" + Buffer.from(obsolete).toString("base64url")));
});

test("verification checks issuer and commitment before revocation", async () => {
  const link = parseLinkFragment(new URL(createShareLink("https://example.invalid", bytes)).hash);
  const commitment = await sha256Hex(bytes);
  const read = async () => ({ record: { issuerId: profile.issuerId, commitment, revoked: false } });
  assert.equal((await verifyReference(link, profile, read)).status, "VALID");
  assert.equal((await verifyReference(link, { ...profile, network: "testnet" }, read)).status, "INVALID");
  assert.equal((await verifyReference(link, profile, async () => ({ record: null }))).status, "INVALID");
  assert.equal((await verifyReference(link, profile, async () => ({ record: { issuerId: "other.sample", commitment, revoked: true } }))).status, "INVALID");
  assert.equal((await verifyReference(link, profile, async () => ({ record: { issuerId: profile.issuerId, commitment: "a".repeat(64), revoked: true } }))).status, "INVALID");
  assert.equal((await verifyReference(link, profile, async () => ({ record: { issuerId: profile.issuerId, commitment, revoked: true } }))).status, "REVOKED");
  assert.equal((await verifyReference(link, profile, async () => { throw new Error("offline"); })).status, "UNAVAILABLE");
});
