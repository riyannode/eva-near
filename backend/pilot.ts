import { timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { normalizeTextInput } from "./reference.ts";
import type { FastifyInstance, FastifyRequest } from "fastify";

export function registerPilot(app: FastifyInstance, origin: string, settings: { database: string; freelancer: string; agency: string }): void {
  const { database, freelancer, agency } = settings;
  if (!database || !/^[A-Za-z0-9_-]{43,}$/u.test(freelancer) || !/^[A-Za-z0-9_-]{43,}$/u.test(agency) || freelancer === agency) throw new Error("INVALID_INPUT");
  const db = new DatabaseSync(database);
  db.exec("CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY, subject TEXT NOT NULL, claim TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'requested', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  app.addHook("onClose", async () => { db.close(); });
  function role(request: FastifyRequest): "freelancer" | "agency" | undefined {
    const token = /^Bearer ([A-Za-z0-9_-]+)$/u.exec(request.headers.authorization ?? "")?.[1] ?? "";
    const match = (expected: string) => {
      const a = Buffer.from(token); const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    };
    return match(freelancer) ? "freelancer" : match(agency) ? "agency" : undefined;
  }
  const host = new URL(origin).host;
  function allowed(request: FastifyRequest): boolean {
    return request.headers.host === host && request.headers.origin === origin;
  }
  app.get<{ Querystring: { role?: string } }>("/api/pilot/requests", async (request, reply) => {
    const reader = role(request);
    if (!reader || reader !== request.query.role) return reply.code(403).send({ code: "FORBIDDEN" });
    return { requests: db.prepare("SELECT id, subject, claim, status FROM requests ORDER BY id DESC").all() };
  });
  app.post<{ Body: { subject: string; claim: string } }>("/api/pilot/requests", { schema: { body: { type: "object", additionalProperties: false, required: ["subject", "claim"], properties: { subject: { type: "string", minLength: 1, maxLength: 80 }, claim: { type: "string", minLength: 1, maxLength: 240 } } } } }, async (request, reply) => {
    if (!allowed(request) || role(request) !== "freelancer") return reply.code(403).send({ code: "FORBIDDEN" });
    let subject: string; let claim: string;
    try { subject = normalizeTextInput(request.body.subject, 80); claim = normalizeTextInput(request.body.claim, 240); } catch { return reply.code(400).send({ code: "INVALID_INPUT" }); }
    db.prepare("INSERT INTO requests (subject, claim) VALUES (?, ?)").run(subject, claim);
    return reply.code(201).send({ ok: true });
  });
  app.patch<{ Params: { id: string }; Body: { status: string } }>("/api/pilot/requests/:id", { schema: { body: { type: "object", additionalProperties: false, required: ["status"], properties: { status: { enum: ["approved", "declined"] } } } } }, async (request, reply) => {
    if (!allowed(request) || role(request) !== "agency") return reply.code(403).send({ code: "FORBIDDEN" });
    if (!/^[1-9][0-9]{0,14}$/u.test(request.params.id)) return reply.code(400).send({ code: "INVALID_INPUT" });
    const result = db.prepare("UPDATE requests SET status = ? WHERE id = ? AND status = 'requested'").run(request.body.status, Number(request.params.id));
    if (!result.changes) {
      const existing = db.prepare("SELECT status FROM requests WHERE id = ?").get(Number(request.params.id));
      if (!existing) return reply.code(404).send({ code: "ROUTE_NOT_FOUND" });
      if (existing.status !== request.body.status) return reply.code(409).send({ code: "PILOT_DECISION_CONFLICT" });
    }
    return { ok: true };
  });
}
