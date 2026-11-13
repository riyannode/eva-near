import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createPayload, encodePayload } from "@eva/backend/reference";

test("issuer wallet revokes a checked reference and a different account cannot", async ({ page }) => {
  const profile = { network: "testnet", contractId: "reference.testnet", issuerId: "studio.testnet" } as const;
  const referenceId = "12".repeat(16);
  const payload = createPayload(profile, {
    referenceId, salt: Buffer.alloc(32, 9).toString("base64url"), subject: "Maya Chen", claim: "Designed the checkout flow.",
  });
  const bytes = encodePayload(payload);
  const keys = generateKeyPairSync("ed25519");
  const fragment = "#r=" + Buffer.from(bytes).toString("base64url") + "." + sign(null, bytes, keys.privateKey).toString("base64url");
  const commitment = createHash("sha256").update(bytes).digest("hex");
  await page.route("**/api/config", route => route.fulfill({ json: { ...profile, issuerLabel: "Studio", canIssue: false } }));
  await page.route("**/api/references/" + referenceId, async route => {
    const transactionSent = await page.locator("html").getAttribute("data-wallet-revoked");
    await route.fulfill({ json: { issuerId: profile.issuerId, issuerKey: keys.publicKey.export({ format: "jwk" }).x,
      commitment, revoked: transactionSent === "true", blockHeight: 120, blockHash: "block" } });
  });
  await page.addInitScript(({ referenceId }) => {
    let accountId = "other.testnet";
    const manifest = { id: "fixture", name: "Fixture NEAR Wallet", features: { testnet: true, signInWithoutAddKey: true, signAndSendTransaction: true } };
    window.addEventListener("near-selector-ready", () => {
      window.dispatchEvent(new CustomEvent("near-wallet-injected", { detail: {
        manifest,
        signIn: ({ network, addFunctionCallKey }: { network: string; addFunctionCallKey?: unknown }) => {
          if (network !== "testnet" || addFunctionCallKey) throw new Error("Wrong wallet setup");
          return [{ accountId }];
        },
        getAccounts: () => [{ accountId }],
        signOut: () => { accountId = "studio.testnet"; },
        signAndSendTransaction: ({ signerId, receiverId, actions, network }: {
          signerId: string; receiverId: string; network: string;
          actions: { type: string; params: { methodName: string; args: object; deposit: string } }[];
        }) => {
          if (signerId !== "studio.testnet" || receiverId !== "reference.testnet" || network !== "testnet" || actions.length !== 1
            || actions[0].type !== "FunctionCall" || actions[0].params.methodName !== "revoke" || actions[0].params.deposit !== "0"
            || JSON.stringify(actions[0].params.args) !== JSON.stringify({ reference_id: referenceId })) throw new Error("Wrong revoke call");
          document.documentElement.dataset.walletRevoked = "true";
          return { transaction: { hash: "fixture-transaction" }, status: { SuccessValue: "" } };
        },
      } }));
    });
  }, { referenceId });
  await page.goto("/agency/wallet");
  await page.getByRole("button", { name: "Connect NEAR Wallet" }).click();
  await page.getByRole("button", { name: "Fixture NEAR Wallet" }).click();
  await expect(page.getByText("This account cannot revoke the agency’s references.")).toBeVisible();
  await page.getByLabel("Reference link").fill(fragment);
  await page.getByRole("button", { name: "Check reference" }).click();
  await expect(page.getByText("VALID", { exact: true })).toBeVisible();
  await expect(page.getByText("Revoke this reference", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Disconnect wallet" }).click();
  await page.getByRole("button", { name: "Fixture NEAR Wallet" }).click();
  await page.getByText("Revoke this reference", { exact: true }).click();
  await page.getByRole("button", { name: "Confirm revoke in wallet" }).click();
  await expect(page.getByText("REVOKED", { exact: true })).toBeVisible();
  await expect(page.getByText("fixture-transaction")).toBeVisible();
});
