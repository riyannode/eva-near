import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import type { ReferenceEnvelope } from "./issuer.ts";
import { assertProfile, createProvider, readReference, submitReferenceAction, type TransactionEvidence } from "./near.ts";
import type { JudgeRuntime } from "./sandbox.ts";
import type { Network, ReferenceProfile } from "./reference.ts";

interface Intent {
  readonly envelope: Promise<ReferenceEnvelope>;
  readonly subject: string;
  readonly claim: string;
  working: boolean;
}

const mode = process.env.APP_MODE;
if (mode !== "sandbox" && mode !== "testnet") throw new Error("APP_MODE must be sandbox or testnet");
const app = Fastify({
  logger: false,
  bodyLimit: 2048,
  requestTimeout: 15_000,
  connectionTimeout: 25_000,
  ajv: { customOptions: { coerceTypes: false, removeAdditional: false, allErrors: false } },
});
const intents = new Map<string, Intent>();
let judge: JudgeRuntime | undefined;
let profile: ReferenceProfile = mode === "sandbox"
  ? { network: "sandbox", contractId: "reference.sandbox", issuerId: "studio.sandbox" }
  : { network: "testnet", contractId: process.env.NEAR_CONTRACT_ID ?? "replace-contract.testnet", issuerId: process.env.NEAR_ISSUER_ID ?? "replace-issuer.testnet" };
let rpcProvider: ReturnType<typeof createProvider> | undefined;
let issuerLabel = process.env.ISSUER_LABEL ?? "Studio A";
let publicOrigin = process.env.APP_ORIGIN ?? process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:8080";

function envValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function accountId(value: string): boolean {
  return value.length >= 2 && value.length <= 64 && /^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\.[a-z0-9]+(?:[-_][a-z0-9]+)*)*$/u.test(value);
}

function configureTestnet(): void {
  const network: Network = "testnet";
  const contractId = envValue("NEAR_CONTRACT_ID");
  const issuerId = envValue("NEAR_ISSUER_ID");
  const rpcUrl = new URL(envValue("NEAR_RPC_URL"));
  const origin = new URL(envValue("PUBLIC_ORIGIN"));
  publicOrigin = origin.origin;
  if (!accountId(contractId) || !accountId(issuerId) || rpcUrl.protocol !== "https:" || rpcUrl.username || rpcUrl.password
    || origin.protocol !== "https:" || origin.href !== origin.origin + "/") {
    throw new Error("INVALID_INPUT");
  }
  profile = { network, contractId, issuerId };
  rpcProvider = createProvider(rpcUrl.href);
  issuerLabel = envValue("ISSUER_LABEL");
}

async function initialize(): Promise<void> {
  if (mode === "sandbox") {
    const { startSandbox } = await import("./sandbox.ts");
    judge = await startSandbox();
    profile = judge.profile;
    rpcProvider = judge.provider;
    issuerLabel = "Studio A";
    publicOrigin = judge.publicOrigin;
    return;
  }
}

app.addHook("onSend", async (_request, reply, payload) => {
  reply.header("Cache-Control", "no-store");
  reply.header("Referrer-Policy", "no-referrer");
  reply.header("X-Content-Type-Options", "nosniff");
  return payload;
});

app.setErrorHandler((error, _request, reply) => {
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error
    ? error.statusCode
    : undefined;
  const status = statusCode === 413 ? 413 : statusCode === 415 ? 415 : 400;
  const code = status === 413 ? "REQUEST_TOO_LARGE" : status === 415 ? "UNSUPPORTED_MEDIA_TYPE" : "INVALID_INPUT";
  reply.code(status).send({ code });
});

app.setNotFoundHandler((_request, reply) => {
  reply.code(404).send({ code: "ROUTE_NOT_FOUND" });
});

app.get("/api/config", async () => ({
  network: profile.network,
  contractId: profile.contractId,
  issuerId: profile.issuerId,
  issuerLabel,
  canIssue: mode === "sandbox",
}));

app.get("/api/health", async () => ({ ok: true }));

app.get("/api/ready", async (_request, reply) => {
  try {
    if (!rpcProvider) throw new Error("UNAVAILABLE");
    await assertProfile(rpcProvider, profile, judge?.issuer.publicKey);
    return { ready: true };
  } catch {
    reply.code(503);
    return { code: "UNAVAILABLE" };
  }
});

app.get<{ Params: { id: string } }>("/api/references/:id", async (request, reply) => {
  if (!/^[a-f0-9]{32}$/u.test(request.params.id)) return reply.code(400).send({ code: "INVALID_INPUT" });
  if (!rpcProvider) return reply.code(503).send({ code: "UNAVAILABLE" });
  try {
    if (await rpcProvider.getNetworkId() !== profile.network) throw new Error("UNAVAILABLE");
    const view = await readReference(rpcProvider, profile.contractId, request.params.id);
    if (view.issuerId !== profile.issuerId || (judge && view.issuerKey !== judge.issuer.publicKey)) throw new Error("UNAVAILABLE");
    if (!view.record) return reply.code(404).send({ code: "REFERENCE_NOT_FOUND" });
    return {
      issuerId: view.issuerId,
      issuerKey: view.issuerKey,
      commitment: view.record.commitment,
      revoked: view.record.revoked,
      blockHeight: view.blockHeight,
      blockHash: view.blockHash,
    };
  } catch {
    return reply.code(503).send({ code: "UNAVAILABLE" });
  }
});

function mutationAllowed(request: FastifyRequest): boolean {
  const expectedHost = new URL(publicOrigin).host;
  return request.headers.host === expectedHost && request.headers.origin === publicOrigin;
}

function logEvidence(evidence: TransactionEvidence | null): void {
  if (evidence) process.stdout.write(`${JSON.stringify({ event: "reference_transaction", ...evidence })}\n`);
}

function sendPending(reply: FastifyReply, code: "ISSUE_PENDING" | "REVOKE_PENDING", referenceId: string) {
  return reply.code(202).send({ code, referenceId });
}

function requireJudge(reply: FastifyReply): JudgeRuntime | undefined {
  if (!judge) reply.code(mode === "sandbox" ? 503 : 404).send({ code: mode === "sandbox" ? "UNAVAILABLE" : "ROUTE_NOT_FOUND" });
  return judge;
}

async function tryIssue(intent: Intent, reply: FastifyReply) {
  const runtime = requireJudge(reply);
  if (!runtime) return;
  const envelope = await intent.envelope;
  try {
    const result = await submitReferenceAction(runtime.provider, runtime.issuerAccount, profile.contractId, {
      action: "issue",
      referenceId: envelope.referenceId,
      commitment: envelope.commitment,
    });
    logEvidence(result.evidence);
    const record = result.finalView;
    if (!record.record || record.record.commitment !== envelope.commitment || record.record.revoked) {
      return sendPending(reply, "ISSUE_PENDING", envelope.referenceId);
    }
    return reply.code(201).send({ referenceId: envelope.referenceId, link: envelope.link });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNAVAILABLE") return reply.code(503).send({ code });
    if (code === "REFERENCE_CONFLICT" || code === "REFERENCE_REVOKED" || code === "CAP_REACHED") {
      return reply.code(409).send({ code });
    }
    try {
      const record = await readReference(runtime.provider, profile.contractId, envelope.referenceId);
      if (record.record?.commitment === envelope.commitment && !record.record.revoked) {
        return reply.code(201).send({ referenceId: envelope.referenceId, link: envelope.link });
      }
      if (record.record && record.record.commitment !== envelope.commitment) {
        return reply.code(409).send({ code: "REFERENCE_CONFLICT" });
      }
      if (record.record?.revoked) return reply.code(409).send({ code: "REFERENCE_REVOKED" });
    } catch {
      return sendPending(reply, "ISSUE_PENDING", envelope.referenceId);
    }
    return sendPending(reply, "ISSUE_PENDING", envelope.referenceId);
  }
}

if (mode === "sandbox") {
  const issueSchema = {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["referenceId", "subject", "claim", "approved"],
      properties: {
        referenceId: { type: "string", pattern: "^[a-f0-9]{32}$" },
        subject: { type: "string", maxLength: 80 },
        claim: { type: "string", maxLength: 240 },
        approved: { const: true },
      },
    },
  } as const;

  app.post<{ Body: { referenceId: string; subject: string; claim: string; approved: true } }>(
    "/api/demo/references",
    { schema: issueSchema },
    async (request, reply) => {
      if (!mutationAllowed(request)) return reply.code(403).send({ code: "FORBIDDEN" });
      if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
        return reply.code(415).send({ code: "UNSUPPORTED_MEDIA_TYPE" });
      }
      if (!rpcProvider) return reply.code(503).send({ code: "UNAVAILABLE" });
      const runtime = requireJudge(reply);
      if (!runtime) return;
      const { referenceId, subject, claim, approved } = request.body;
      if (approved !== true || !/^[a-f0-9]{32}$/u.test(referenceId)) return reply.code(400).send({ code: "INVALID_INPUT" });
      let intent = intents.get(referenceId);
      if (intent && (intent.subject !== subject || intent.claim !== claim)) return reply.code(409).send({ code: "REFERENCE_CONFLICT" });
      if (!intent) {
        if (intents.size >= 1024) return reply.code(409).send({ code: "CAP_REACHED" });
        const { createEnvelope } = await import("./issuer.ts");
        intent = {
          envelope: createEnvelope(profile, publicOrigin, runtime.issuer, { referenceId, subject, claim }),
          subject,
          claim,
          working: true,
        };
        intents.set(referenceId, intent);
        try {
          await intent.envelope;
        } catch {
          intents.delete(referenceId);
          return reply.code(400).send({ code: "INVALID_INPUT" });
        }
        intent.working = false;
      }
      if (intent.working) return sendPending(reply, "ISSUE_PENDING", referenceId);
      intent.working = true;
      try {
        return await tryIssue(intent, reply);
      } finally {
        intent.working = false;
      }
    },
  );

  app.get<{ Params: { id: string } }>("/api/demo/references/:id", async (request, reply) => {
    if (request.headers.host !== new URL(publicOrigin).host) return reply.code(403).send({ code: "FORBIDDEN" });
    if (!/^[a-f0-9]{32}$/u.test(request.params.id)) return reply.code(400).send({ code: "INVALID_INPUT" });
    const intent = intents.get(request.params.id);
    if (!intent) return reply.code(404).send({ code: "REFERENCE_NOT_FOUND" });
    if (!rpcProvider) return reply.code(503).send({ code: "UNAVAILABLE" });
    try {
      const envelope = await intent.envelope;
      const view = await readReference(rpcProvider, profile.contractId, request.params.id);
      if (view.record?.commitment === envelope.commitment && !view.record.revoked) {
        return { referenceId: request.params.id, link: envelope.link };
      }
      if (view.record && view.record.commitment !== envelope.commitment) return reply.code(409).send({ code: "REFERENCE_CONFLICT" });
      return sendPending(reply, "ISSUE_PENDING", request.params.id);
    } catch {
      return reply.code(503).send({ code: "UNAVAILABLE" });
    }
  });

  app.post<{ Params: { id: string }; Body: Record<string, never> }>("/api/demo/references/:id/revoke", {
    schema: { body: { type: "object", additionalProperties: false, maxProperties: 0 } },
  }, async (request, reply) => {
    if (!mutationAllowed(request)) return reply.code(403).send({ code: "FORBIDDEN" });
    if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
      return reply.code(415).send({ code: "UNSUPPORTED_MEDIA_TYPE" });
    }
    const runtime = requireJudge(reply);
    if (!runtime) return;
    const referenceId = request.params.id;
    if (!/^[a-f0-9]{32}$/u.test(referenceId)) return reply.code(400).send({ code: "INVALID_INPUT" });
    const intent = intents.get(referenceId);
    if (!intent) return reply.code(404).send({ code: "REFERENCE_NOT_FOUND" });
    if (intent.working) return sendPending(reply, "REVOKE_PENDING", referenceId);
    intent.working = true;
    try {
      const result = await submitReferenceAction(runtime.provider, runtime.issuerAccount, profile.contractId, {
        action: "revoke",
        referenceId,
      });
      logEvidence(result.evidence);
      const view = result.finalView;
      if (!view.record) return reply.code(404).send({ code: "REFERENCE_NOT_FOUND" });
      if (!view.record.revoked) return sendPending(reply, "REVOKE_PENDING", referenceId);
      return { referenceId, revoked: true };
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "UNAVAILABLE") return reply.code(503).send({ code });
      if (code === "REFERENCE_NOT_FOUND") return reply.code(404).send({ code });
      try {
        const view = await readReference(runtime.provider, profile.contractId, referenceId);
        if (view.record?.revoked) return { referenceId, revoked: true };
        if (!view.record) return reply.code(404).send({ code: "REFERENCE_NOT_FOUND" });
      } catch {
        return reply.code(503).send({ code: "UNAVAILABLE" });
      }
      return sendPending(reply, "REVOKE_PENDING", referenceId);
    } finally {
      intent.working = false;
    }
  });
}

const address = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? "3000");
if (mode === "testnet") configureTestnet();
if (mode === "sandbox") {
  const origin = new URL(publicOrigin);
  if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1" || origin.href !== origin.origin + "/") {
    throw new Error("INVALID_INPUT");
  }
  publicOrigin = origin.origin;
}
await app.listen({ host: address, port });
process.stdout.write(`${JSON.stringify({ event: "server_listening", mode, address, port })}\n`);
void initialize().catch(() => {
  process.stdout.write(`${JSON.stringify({ event: "initialization_failed", mode, code: "UNAVAILABLE" })}\n`);
});

async function close(): Promise<void> {
  await app.close();
  await judge?.close();
}

process.once("SIGINT", () => void close());
process.once("SIGTERM", () => void close());
