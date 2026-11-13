import { expect, test } from "@playwright/test";

test("wallet issues only after final matching record and revokes as owner", async ({ page }) => {
  let record: { issuerId: string; commitment: string; revoked: boolean } | null = null;
  await page.route("**/api/config", route => route.fulfill({ json: { network: "testnet", contractId: "reference.testnet", canIssue: false } }));
  await page.route("**/api/references/*", route => record
    ? route.fulfill({ json: { ...record, blockHeight: 120, blockHash: "A".repeat(44) } })
    : route.fulfill({ status: 404, json: { code: "REFERENCE_NOT_FOUND" } }));
  await page.exposeFunction("walletAction", (transaction: { signerId: string; receiverId: string; network: string; actions: { type: string; params: { methodName: string; args: { reference_id: string; commitment?: string }; deposit: string } }[] }) => {
    expect(transaction.signerId).toBe("studio.testnet");
    expect(transaction.receiverId).toBe("reference.testnet");
    expect(transaction.network).toBe("testnet");
    expect(transaction.actions).toHaveLength(1);
    const action = transaction.actions[0];
    expect(action.type).toBe("FunctionCall");
    if (action.params.methodName === "issue") {
      expect(action.params.deposit).toBe("10000000000000000000000");
      expect(action.params.args.reference_id).toMatch(/^[a-f0-9]{32}$/);
      expect(action.params.args.commitment).toMatch(/^[a-f0-9]{64}$/);
      record = { issuerId: "studio.testnet", commitment: action.params.args.commitment!, revoked: false };
    } else {
      expect(action.params.methodName).toBe("revoke");
      expect(action.params.deposit).toBe("0");
      expect(record).not.toBeNull();
      record = { ...record!, revoked: true };
    }
    return { status: { SuccessValue: "" } };
  });
  await page.addInitScript(() => {
    const manifest = { id: "fixture", name: "Fixture NEAR Wallet", type: "injected", features: { testnet: true, signInWithoutAddKey: true, signAndSendTransaction: true } };
    window.addEventListener("near-selector-ready", () => window.dispatchEvent(new CustomEvent("near-wallet-injected", { detail: {
      manifest,
      signIn: () => [{ accountId: "other.testnet" }, { accountId: "studio.testnet" }],
      getAccounts: () => [{ accountId: "other.testnet" }, { accountId: "studio.testnet" }],
      signOut: () => {},
      signAndSendTransaction: (transaction: unknown) => (window as unknown as { walletAction: (value: unknown) => unknown }).walletAction(transaction),
    } })));
  });
  await page.goto("/agency");
  await page.getByRole("button", { name: "Connect NEAR Wallet" }).click();
  await page.getByRole("button", { name: "Fixture NEAR Wallet" }).click();
  await page.getByLabel("Issuer account").selectOption("studio.testnet");
  await page.getByLabel("Professional name or alias").fill("Maya Chen");
  await page.getByLabel("Approved contribution").fill("Designed the checkout flow.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Issue reference" }).click();
  await expect(page.getByText("VALID", { exact: true })).toBeVisible();
  const href = await page.getByRole("link", { name: "Open reference" }).getAttribute("href");
  expect(href).toMatch(/\/verify#r=/);
  const parsed: unknown = JSON.parse(Buffer.from(new URL(href!).hash.slice(3), "base64url").toString("utf8"));
  expect(parsed).toEqual(["eva:reference:v2", "testnet", "reference.testnet", "studio.testnet",
    expect.stringMatching(/^[a-f0-9]{32}$/), expect.stringMatching(/^[A-Za-z0-9_-]{43}$/), "Maya Chen", "Designed the checkout flow."]);
  const recruiter = await page.context().newPage();
  await recruiter.route("**/api/config", route => route.fulfill({ json: { network: "testnet", contractId: "reference.testnet", canIssue: false } }));
  await recruiter.route("**/api/references/*", route => route.fulfill({ json: { ...record, blockHeight: 120, blockHash: "A".repeat(44) } }));
  await recruiter.goto(href!);
  await expect(recruiter.getByRole("status")).toContainText("VALID");
  await expect(recruiter.getByRole("button", { name: "Connect NEAR Wallet" })).toHaveCount(0);
  await page.getByLabel("Issuer account").selectOption("other.testnet");
  await expect(page.getByText("Revoke this reference")).toHaveCount(0);
  await page.getByLabel("Issuer account").selectOption("studio.testnet");
  await page.getByRole("button", { name: "Check reference" }).click();
  await page.getByText("Revoke this reference").click();
  await page.getByRole("button", { name: "Confirm revoke in wallet" }).click();
  await expect(page.getByText("REVOKED", { exact: true })).toBeVisible();
  await recruiter.reload();
  await expect(recruiter.getByRole("status")).toContainText("REVOKED");
});

test("rejection, failure, and unconfirmed submission keep the same issue ID", async ({ page }) => {
  let calls = 0;
  let firstId = "";
  let commitment = "";
  let confirm = false;
  await page.route("**/api/config", route => route.fulfill({ json: { network: "testnet", contractId: "reference.testnet", canIssue: false } }));
  await page.route("**/api/references/*", route => confirm
    ? route.fulfill({ json: { issuerId: "studio.testnet", commitment, revoked: false, blockHeight: 120, blockHash: "A".repeat(44) } })
    : route.fulfill({ status: 404, json: { code: "REFERENCE_NOT_FOUND" } }));
  await page.exposeFunction("walletAction", (transaction: { actions: { params: { args: { reference_id: string; commitment: string } } }[] }) => {
    const args = transaction.actions[0].params.args;
    if (!firstId) firstId = args.reference_id;
    expect(args.reference_id).toBe(firstId);
    commitment = args.commitment;
    calls += 1;
    if (calls === 1) throw new Error("User rejected");
    if (calls === 2) return { status: { Failure: {} } };
    return { status: { SuccessValue: "" } };
  });
  await page.addInitScript(() => {
    const manifest = { id: "fixture", name: "Fixture NEAR Wallet", type: "injected", features: { testnet: true, signInWithoutAddKey: true, signAndSendTransaction: true } };
    window.addEventListener("near-selector-ready", () => window.dispatchEvent(new CustomEvent("near-wallet-injected", { detail: {
      manifest, signIn: () => [{ accountId: "studio.testnet" }], getAccounts: () => [{ accountId: "studio.testnet" }], signOut: () => {},
      signAndSendTransaction: (transaction: unknown) => (window as unknown as { walletAction: (value: unknown) => unknown }).walletAction(transaction),
    } })));
  });
  await page.goto("/agency");
  await page.getByRole("button", { name: "Connect NEAR Wallet" }).click();
  await page.getByRole("button", { name: "Fixture NEAR Wallet" }).click();
  await page.getByLabel("Professional name or alias").fill("Maya Chen");
  await page.getByLabel("Approved contribution").fill("Designed the checkout flow.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Issue reference" }).click();
  await expect(page.getByRole("status")).toContainText("rejected");
  await expect(page.getByRole("link", { name: "Open reference" })).toHaveCount(0);
  await page.getByRole("button", { name: "Check final status" }).click();
  await page.getByRole("button", { name: "Retry same transaction" }).click();
  await expect(page.getByRole("status")).toContainText("Transaction failed");
  await expect(page.getByRole("link", { name: "Open reference" })).toHaveCount(0);
  await page.getByRole("button", { name: "Check final status" }).click();
  await page.getByRole("button", { name: "Retry same transaction" }).click();
  await expect(page.getByRole("button", { name: "Retry same transaction" })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Open reference" })).toHaveCount(0);
  confirm = true;
  await page.getByRole("button", { name: "Check final status" }).click();
  await expect(page.getByRole("link", { name: "Open reference" })).toBeVisible();
  expect(calls).toBe(3);
});

test("served Meteor adapter connects and signs in its sandboxed frame", async ({ page }) => {
  test.skip(process.env.EVA_E2E_MODE !== "vps" || test.info().project.name !== "chromium", "Requires the local VPS image and Chromium");
  const contractId = "replace-with-contract.testnet";
  const issuerId = "studio.testnet";
  let referenceId = "";
  let record: { issuerId: string; commitment: string; revoked: boolean } | undefined;
  let signatures = 0;
  let executorLoaded = false;
  page.on("response", response => {
    if (new URL(response.url()).pathname === "/wallet/meteor-near-connect.js" && response.ok()) executorLoaded = true;
  });
  await page.route("https://**/*", async route => {
    if (new URL(route.request().url()).hostname !== "test.rpc.fastnear.com") return route.abort();
    const body = route.request().postDataJSON();
    expect(body.method).toBe("block");
    await route.fulfill({ headers: { "access-control-allow-origin": "*" }, json: {
      jsonrpc: "2.0", id: body.id, result: { header: { hash: "1".repeat(32), height: 25 } },
    } });
  });
  await page.route("**/api/references/*", route => record && new URL(route.request().url()).pathname.endsWith("/" + referenceId)
    ? route.fulfill({ json: { ...record, blockHeight: 120, blockHash: "A".repeat(44) } })
    : route.fulfill({ status: 404, json: { code: "REFERENCE_NOT_FOUND" } }));
  await page.exposeFunction("meteorWalletAction", (request: {
    uid: string; status: string; network: string; actionType: string;
    inputs?: { public_key?: string; contract_id?: string; transactions?: string };
  }) => {
    if (request.status !== "initializing") return;
    expect(request.network).toBe("testnet");
    if (request.actionType === "login") {
      expect(request.inputs).toEqual({ methods: [] });
      return { uid: request.uid, status: "closed_success", endTags: [], payload: { accountId: issuerId, allKeys: [] } };
    }
    expect(request.actionType).toBe("sign");
    const transaction = Buffer.from(request.inputs?.transactions ?? "", "base64").toString("utf8");
    expect(transaction).toContain(issuerId);
    expect(transaction).toContain(contractId);
    signatures += 1;
    if (!record) {
      expect(transaction).toContain("issue");
      const args = /\{"reference_id":"([a-f0-9]{32})","commitment":"([a-f0-9]{64})"\}/u.exec(transaction);
      expect(args).toBeTruthy();
      referenceId = args![1];
      record = { issuerId, commitment: args![2], revoked: false };
    } else {
      expect(transaction).toContain("revoke");
      expect(transaction).toContain(JSON.stringify({ reference_id: referenceId }));
      record.revoked = true;
    }
    return { uid: request.uid, status: "closed_success", endTags: [], payload: { executionOutcomes: [{ status: { SuccessValue: "" } }] } };
  });
  await page.addInitScript(() => Object.assign(window, {
    meteorCom: { features: [] },
    meteorComV2: { version: "2", featureFlags: [], sendMessageDataAndRespond: (request: unknown) =>
      Reflect.get(window, "meteorWalletAction")(request) },
  }));

  const response = await page.goto("/agency");
  const nonce = await page.locator('meta[name="eva-csp-nonce"]').getAttribute("content");
  expect(nonce).toMatch(/^[A-Za-z0-9]{32}$/u);
  expect(response?.headers()["content-security-policy"]).toContain("'nonce-" + nonce + "'");
  await page.getByRole("button", { name: "Connect NEAR Wallet" }).click();
  await page.getByRole("button", { name: "Meteor Wallet", exact: true }).click();
  await page.frameLocator("iframe[sandbox=allow-scripts]").getByText("Chrome Extension", { exact: true }).click();
  await expect(page.getByLabel("Issuer account")).toHaveValue(issuerId);
  expect(executorLoaded).toBe(true);
  await page.getByLabel("Professional name or alias").fill("Maya Chen");
  await page.getByLabel("Approved contribution").fill("Designed an accessible checkout flow.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Issue reference" }).click();
  await expect(page.getByText("VALID", { exact: true })).toBeVisible();
  await page.getByText("Revoke this reference").click();
  await page.getByRole("button", { name: "Confirm revoke in wallet" }).click();
  await expect(page.getByText("REVOKED", { exact: true })).toBeVisible();
  expect(signatures).toBe(2);
});
