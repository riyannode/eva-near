import { createShareLink, createPayload, encodePayload, randomSalt, sha256Hex, type ReferenceProfile } from "./reference.ts";

export interface ReferenceEnvelope {
  readonly referenceId: string;
  readonly commitment: string;
  readonly link: string;
}

export async function createEnvelope(profile: ReferenceProfile, origin: string, input: { readonly referenceId: string; readonly subject: string; readonly claim: string }): Promise<ReferenceEnvelope> {
  const payloadBytes = encodePayload(createPayload(profile, { ...input, salt: randomSalt() }));
  return { referenceId: input.referenceId, commitment: await sha256Hex(payloadBytes), link: createShareLink(origin, payloadBytes) };
}
