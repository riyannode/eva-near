import { defineConfig } from "@playwright/test";

const external = process.env.EVA_E2E_ORIGIN;
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 45_000,
  workers: 1,
  use: { baseURL: external ?? "http://127.0.0.1:4173", ignoreHTTPSErrors: process.env.EVA_E2E_LOCAL_TLS === "1" },
  webServer: external ? undefined : {
    command: "pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    timeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
