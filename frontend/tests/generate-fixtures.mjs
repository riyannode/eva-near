import { writeFileSync } from "node:fs";
import { createPayload, encodePayload, createShareLink, sha256Hex } from "../../backend/reference.ts";

const profile = { network: "sample", contractId: "reference.sample", issuerId: "studio.sample" };
const salt = "A".repeat(43);

async function fixture(digit, subject, claim, revoked) {
  const payload = createPayload(profile, { referenceId: digit.repeat(32), salt, subject, claim });
  const bytes = encodePayload(payload);
  return {
    fragment: new URL(createShareLink("https://example.invalid", bytes)).hash,
    commitment: await sha256Hex(bytes), revoked,
  };
}
const Valid = await fixture("1", "Alex Morgan", "Designed the checkout flow for an e-commerce project.", false);
const Revoked = await fixture("2", "Alex Morgan", "Designed a product comparison page.", true);
const encoded = Valid.fragment.slice(3);
const Edited = {
  ...Valid,
  fragment: "#r=" + Buffer.from(Buffer.from(encoded, "base64url").toString().replace("flow", "glow")).toString("base64url"),
};
const Unicode = await fixture("3", "Cafe\u0301", "Designed the été flow for 東京.", false);
writeFileSync(new URL("../src/demo.json", import.meta.url),
  JSON.stringify({ Valid, Revoked, Edited, Unicode }, null, 2) + "\n");
