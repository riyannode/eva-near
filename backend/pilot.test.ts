import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import { registerPilot } from "./pilot.ts";

const origin = "http://127.0.0.1:8080";
const freelancer = "f".repeat(43); const agency = "a".repeat(43);
test("pilot role access, decision, and restart persistence", async () => {
  const dir = mkdtempSync(join(tmpdir(), "eva-pilot-"));
  const settings = { database: join(dir, "pilot.sqlite"), freelancer, agency };
  const headers = (code: string) => ({ host: "127.0.0.1:8080", origin, authorization: `Bearer ${code}` });
  let app = Fastify();
  try {
    assert.equal((await app.inject({ method: "GET", url: "/api/pilot/requests?role=agency" })).statusCode, 404);
    await app.close();
    app = Fastify(); registerPilot(app, origin, settings);
    assert.equal((await app.inject({ method: "GET", url: "/api/pilot/requests?role=agency", headers: headers(freelancer) })).statusCode, 403);
    assert.equal((await app.inject({ method: "GET", url: "/api/pilot/requests", headers: headers("") })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: "/api/pilot/requests", headers: headers(agency), payload: { subject: "Alex", claim: "Designed checkout." } })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: "/api/pilot/requests", headers: headers(freelancer), payload: { subject: "Alex", claim: "Designed checkout." } })).statusCode, 201);
    assert.equal((await app.inject({ method: "PATCH", url: "/api/pilot/requests/1", headers: headers(freelancer), payload: { status: "approved" } })).statusCode, 403);
    assert.equal((await app.inject({ method: "PATCH", url: "/api/pilot/requests/1", headers: headers(agency), payload: { status: "approved" } })).statusCode, 200);
    assert.equal((await app.inject({ method: "PATCH", url: "/api/pilot/requests/1", headers: headers(agency), payload: { status: "approved" } })).statusCode, 200);
    const conflict = await app.inject({ method: "PATCH", url: "/api/pilot/requests/1", headers: headers(agency), payload: { status: "declined" } });
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().code, "PILOT_DECISION_CONFLICT");
    await app.close();
    app = Fastify(); registerPilot(app, origin, settings);
    const response = await app.inject({ method: "GET", url: "/api/pilot/requests?role=freelancer", headers: headers(freelancer) });
    assert.equal(response.json().requests[0].status, "approved");
  } finally { await app.close(); rmSync(dir, { recursive: true, force: true }); }
});
