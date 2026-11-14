import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePayload, parseLinkFragment, sha256Hex, verifyReference } from "@eva/backend/reference";

const fixtures = JSON.parse(readFileSync(new URL("../src/demo.json", import.meta.url), "utf8"));
const profile = { network: "sample", contractId: "reference.sample", issuerId: "studio.sample" } as const;

test("sample Unicode matches the v2 canonical bytes", async () => {
  const { fragment, commitment } = fixtures.Unicode;
  const link = parseLinkFragment(fragment);
  const expected = Buffer.from(JSON.stringify([
    "eva:reference:v2", "sample", "reference.sample", "studio.sample", "3".repeat(32), "A".repeat(43),
    "Café", "Designed the été flow for 東京.",
  ]));
  assert.deepEqual(Buffer.from(encodePayload(link.payload)), expected);
  assert.equal(await sha256Hex(expected), commitment);
  const result = await verifyReference(link, profile, async () => ({
    record: { issuerId: profile.issuerId, commitment, revoked: false },
  }));
  assert.equal(result.status, "VALID");
});
