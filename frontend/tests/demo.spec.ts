import { expect, test } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const fixtures = JSON.parse(readFileSync(new URL("../src/demo.json", import.meta.url), "utf8"));

for (const width of [360, 1280]) {
  test("sample states, keyboard and layout at " + width, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reads: string[] = [];
    page.on("request", request => {
      if (/\/api\/(references|demo)(?:\/|$)/.test(new URL(request.url()).pathname)) reads.push(request.method());
    });
    await page.goto("/demo");
    const result = page.getByRole("status");
    await expect(result.getByText("VALID", { exact: true })).toBeVisible();
    await expect(page.getByText("Sample data", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Designed the checkout flow for an e-commerce project.", { exact: true })).toBeVisible();
    await expect(page.getByText("Signed by Studio A")).toBeVisible();
    await expect(page.getByText("Client name and project files are kept private.")).toBeVisible();
    if (info.project.name === "chromium" && process.env.EVA_E2E_EVIDENCE) {
      await page.screenshot({ path: process.env.EVA_E2E_EVIDENCE + "/eva-sample-" + width + ".png" });
    }
    await page.getByRole("button", { name: "Try the demo" }).click();
    await expect(page.getByRole("button", { name: "Valid", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Revoked", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(result.getByText("REVOKED", { exact: true })).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(result.getByText("INVALID", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Simulate sample issue" }).click();
    await expect(page.getByRole("button", { name: "Open sample reference" })).toBeEnabled();
    await expect(result.getByText("VALID", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Open sample reference" }).click();
    await expect(page.locator("#sample-reference")).toBeFocused();
    await expect(page.getByRole("button", { name: "Simulate sample revoke" })).toBeEnabled();
    await page.getByRole("button", { name: "Simulate sample revoke" }).click();
    await expect(result.getByText("REVOKED", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reset walkthrough" }).click();
    await expect(result.getByText("VALID", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => ({
      fits: document.documentElement.scrollWidth <= innerWidth,
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, secure: isSecureContext,
    }))).toEqual({ fits: true, reduced: true, secure: true });
    expect(reads).toEqual([]);
  });
}

test("landing entry, project workflow and same-origin pasted verifier link", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) {
      expect(url.search + url.hash).toBe("");
      apiRequests.push(url.pathname);
    }
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Show what you did on a confidential project", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a reference", exact: true })).toHaveAttribute("href", "/freelancer");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Demo" })).toHaveAttribute("href", "/demo");
  await expect(page.getByRole("link", { name: "Check a reference" })).toHaveAttribute("href", "/verify");
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByRole("heading", { name: "Show what you did on a confidential project", exact: true })).toBeInViewport();
  const sample = page.getByRole("figure");
  await expect(sample.getByText("Designed the checkout flow for an online store.")).toBeInViewport();
  await expect(sample.getByText("Studio A")).toBeInViewport();
  await expect(sample.getByText("Client name and project files stay private.")).toBeInViewport();
  await page.getByRole("link", { name: "Request a reference", exact: true }).click();
  await expect(page).toHaveURL(/\/freelancer$/);
  await page.getByLabel("Professional name or alias", { exact: true }).fill("Jordan Lee");
  await page.getByLabel("Contribution to approve", { exact: true }).fill("Built an accessible checkout flow.");
  await page.getByRole("button", { name: "Prepare draft" }).click();
  await expect(page.getByLabel("Copy this request to your agency")).toHaveValue(/Built an accessible checkout flow/);

  await page.goto("/verify");
  const origin = new URL(page.url()).origin;
  await page.getByLabel("Paste an EVA reference link or #r= fragment").fill(origin + "//verify");
  await page.getByRole("button", { name: "Check reference" }).click();
  await expect(page.getByRole("alert")).toContainText("from this site");
  await page.getByLabel("Paste an EVA reference link or #r= fragment").fill(origin + "/verify" + fixtures.Valid.fragment);
  await page.getByRole("button", { name: "Check reference" }).click();
  await expect.poll(() => page.evaluate(() => location.pathname + location.hash)).toBe("/verify" + fixtures.Valid.fragment);
  expect(apiRequests.every(path => path === "/api/config" || path.startsWith("/api/references/"))).toBe(true);
});

test("homepage role paths lead to their primary tasks", async ({ page }) => {
  for (const [label, path, heading] of [
    ["Freelancer: request a reference", "/freelancer", "Request a reference for your work"],
    ["Agency: review a request", "/agency", "Review reference requests"],
    ["Recruiter: verify a reference", "/recruiter", "Verify a work reference"],
  ]) {
    await page.goto("/");
    await page.getByRole("link", { name: new RegExp(label) }).click();
    await expect(page).toHaveURL(new RegExp(path + "$"));
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});

test("Unicode golden payload matches the browser digest", async ({ page }) => {
  await page.goto("/demo");
  const result = await page.evaluate(async ({ fragment, issuerKey }) => {
    const [payload, signature] = fragment.slice(3).split(".");
    const decode = (value: string) => Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), char => char.charCodeAt(0));
    const bytes = decode(payload);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const key = await crypto.subtle.importKey("raw", decode(issuerKey), "Ed25519", false, ["verify"]);
    return {
      digest: Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join(""),
      valid: await crypto.subtle.verify("Ed25519", key, decode(signature), bytes),
      decoded: new TextDecoder().decode(bytes),
    };
  }, { fragment: fixtures.Unicode.fragment, issuerKey: fixtures.issuerKey });
  expect(result.digest).toBe(fixtures.Unicode.commitment);
  expect(result.valid).toBe(true);
  expect(result.decoded).toContain('"Café","Designed the été flow for 東京."');
});

test("unsupported Ed25519 makes sample verification unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(SubtleCrypto.prototype, "importKey", {
      value: () => Promise.reject(new DOMException("Ed25519 unsupported", "NotSupportedError")),
    });
  });
  await page.goto("/demo");
  await expect(page.getByRole("status").getByText("UNAVAILABLE", { exact: true })).toBeVisible();
  await expect(page.getByText("Sample data", { exact: true }).first()).toBeVisible();
});

test("Sandbox issue, walletless verification, revocation and edit rejection", async ({ page, context, request }, info) => {
  test.skip(process.env.EVA_E2E_MODE !== "sandbox", "Requires the Judge Compose stack");
  const origin = process.env.EVA_E2E_ORIGIN!;
  await page.goto("/issue");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Issue reference" }).click();
  const open = page.getByRole("link", { name: "Open reference" });
  const checkIssue = page.getByRole("button", { name: "Check status", exact: true });
  await expect(open.or(checkIssue)).toBeVisible({ timeout: 12_000 });
  if (await checkIssue.isVisible()) await checkIssue.click();
  await expect(open).toBeVisible({ timeout: 10_000 });
  const href = await open.getAttribute("href");
  expect(href).toBeTruthy();
  if (info.project.name === "chromium" && process.env.EVA_E2E_SAVE_LINK) {
    writeFileSync(process.env.EVA_E2E_SAVE_LINK, href!, { mode: 0o600, flag: "wx" });
  }
  const verifier = await context.newPage();
  const requests: string[] = [];
  verifier.on("request", r => {
    const url = new URL(r.url());
    if (url.pathname.startsWith("/api/")) {
      expect(url.origin).toBe(origin);
      expect(url.search + url.hash).toBe("");
      expect(r.postData()).toBeNull();
      requests.push(url.pathname);
    }
  });
  await verifier.goto(origin + "/verify");
  await verifier.getByLabel("Paste an EVA reference link or #r= fragment").fill(href!);
  await verifier.getByRole("button", { name: "Check reference" }).click();
  await expect.poll(() => verifier.evaluate(() => location.href)).toBe(href);
  const verdict = verifier.getByRole("status");
  const valid = verdict.getByText("VALID", { exact: true });
  const unavailable = verdict.getByText("UNAVAILABLE", { exact: true });
  await expect(valid.or(unavailable)).toBeVisible({ timeout: 10_000 });
  if (await unavailable.isVisible()) await verifier.getByRole("button", { name: "Check again" }).click();
  await expect(valid).toBeVisible({ timeout: 10_000 });
  await expect(verifier.getByText("Local NEAR Sandbox", { exact: true }).first()).toBeVisible();
  const fragment = new URL(href!).hash;
  const [encoded, signature] = fragment.slice(3).split(".");
  const fields: string[] = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  const statusPath = "/api/references/" + fields[4];
  expect([...new Set(requests)]).toEqual(["/api/config", statusPath]);
  if (info.project.name === "chromium" && process.env.EVA_E2E_EVIDENCE) {
    await verifier.screenshot({ path: process.env.EVA_E2E_EVIDENCE + "/eva-sandbox-valid.png" });
  }
  const live = await request.get(statusPath);
  expect(live.status()).toBe(200);
  const active = await live.json();
  expect(active.revoked).toBe(false);
  expect(active.blockHeight).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.getByRole("button", { name: "Confirm revoke" }).click();
  await expect(page.getByRole("status")).toContainText("Reference revoked");
  await verifier.reload();
  await expect(verdict.getByText("REVOKED", { exact: true })).toBeVisible();
  if (info.project.name === "chromium" && process.env.EVA_E2E_EVIDENCE) {
    await verifier.screenshot({ path: process.env.EVA_E2E_EVIDENCE + "/eva-sandbox-revoked.png" });
  }
  await expect(verifier.getByText(fields[7], { exact: true })).toHaveCount(0);
  const updated = await (await request.get(statusPath)).json();
  expect(updated.revoked).toBe(true);
  expect(updated.commitment).toBe(active.commitment);
  for (const [index, value] of [[6, "Altered subject"], [7, "Altered contribution"], [5, "A".repeat(43)],
    [1, "testnet"], [2, "other.sandbox"], [3, "other.sandbox"]] as const) {
    const changed = [...fields];
    changed[index] = value;
    await verifier.goto(origin + "/verify#r=" + Buffer.from(JSON.stringify(changed)).toString("base64url") + "." + signature);
    await expect(verdict.getByText("INVALID", { exact: true })).toBeVisible();
  }
  const badSignature = Buffer.from(signature, "base64url");
  badSignature[0] ^= 1;
  await verifier.goto(origin + "/verify#r=" + encoded + "." + badSignature.toString("base64url"));
  await expect(verdict.getByText("INVALID", { exact: true })).toBeVisible();
  fields[4] = "f".repeat(32);
  await verifier.goto(origin + "/verify#r=" + Buffer.from(JSON.stringify(fields)).toString("base64url") + "." + signature);
  await expect(verdict.getByText("INVALID", { exact: true })).toBeVisible();
  expect((await request.get("/api/references/" + fields[4])).status()).toBe(404);
});

test("VPS serves sample and closes local mutation routes", async ({ page, request }) => {
  test.skip(process.env.EVA_E2E_MODE !== "vps", "Requires the local VPS Compose stack");
  await page.goto("/demo");
  await expect(page.getByRole("status").getByText("VALID", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Issue in Local NEAR Sandbox" })).toHaveCount(0);
  expect((await request.get("/issue")).status()).toBe(404);
  expect((await request.get("/verify")).status()).toBe(200);
  expect((await request.post("/api/demo/references", { data: {} })).status()).toBe(404);
  expect((await request.post("/api/demo/references/" + "f".repeat(32) + "/revoke", { data: {} })).status()).toBe(404);
  expect((await request.get("/api/ready")).status()).toBe(503);
});

test("RPC loss shows UNAVAILABLE on the same Sandbox link", async ({ page }) => {
  test.skip(!process.env.EVA_E2E_LINK_FILE, "Requires a preissued Sandbox link and stopped RPC");
  await page.goto(readFileSync(process.env.EVA_E2E_LINK_FILE!, "utf8"));
  await expect(page.getByRole("status").getByText("UNAVAILABLE", { exact: true })).toBeVisible();
  await expect(page.getByText("Local NEAR Sandbox", { exact: true }).first()).toBeVisible();
  expect((await page.request.get("/api/ready")).status()).toBe(503);
  expect((await page.request.get("/api/health")).status()).toBe(200);
});

test("concurrent issue retries keep one envelope and enforce local access", async ({ request }) => {
  test.skip(process.env.EVA_E2E_MODE !== "sandbox", "Requires the Judge Compose stack");
  const origin = process.env.EVA_E2E_ORIGIN!;
  const referenceId = globalThis.crypto.randomUUID().replaceAll("-", "");
  const path = "/api/demo/references";
  const data = { referenceId, subject: "Alex Morgan", claim: "Designed a payment confirmation screen.", approved: true };
  const headers = { Origin: origin };
  const forbidden = await request.post(path, { headers: { Origin: "https://outside.invalid" }, data });
  expect(forbidden.status()).toBe(403);
  expect((await request.post(path, { headers, data: { ...data, extra: true } })).status()).toBe(400);
  const first = await Promise.all([
    request.post(path, { headers, data }),
    request.post(path, { headers, data }),
  ]);
  for (const response of first) expect([201, 202]).toContain(response.status());
  await expect.poll(async () => (await request.post(path, { headers, data })).status(), { timeout: 15_000 }).toBe(201);
  const finalResponse = await request.get(path + "/" + referenceId);
  expect(finalResponse.status()).toBe(200);
  const final = await finalResponse.json();
  const retry = await request.post(path, { headers, data });
  expect(retry.status()).toBe(201);
  expect(await retry.json()).toEqual(final);
  for (const response of first) {
    if (response.status() === 201) expect(await response.json()).toEqual(final);
  }
  expect((await request.post(path, { headers, data: { ...data, claim: "Changed contribution." } })).status()).toBe(409);
});
