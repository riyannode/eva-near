# EVA

**Verify the work. Keep the client confidential.**

EVA gives a recruiter one agency-signed contribution statement to verify. The share link contains the approved name or alias and one claim; the contract stores only a salted-payload commitment and revocation status. Client names and project files stay out of the flow. The agency is responsible for its approval and reputation.

## Try it

### 1. Open the sample

Open `/` in the local app. See three clearly labeled examples: `VALID`, `REVOKED`, and `INVALID` (`Edited`). These use `Sample data` and require no RPC.

### 2. Run the local NEAR Sandbox

Requirements: Docker Engine with Compose v2, `linux/amd64`, and internet access for the first image build.

```sh
docker compose up
```

Open `http://127.0.0.1:8080`, then choose **Issue a reference**. Approve the preview, issue, open the generated fragment link, revoke, and refresh. Each step is labeled **Local NEAR Sandbox**. No wallet, faucet, or API key is needed. The session is ephemeral: restarting the backend/Sandbox invalidates local records.

```sh
docker compose ps
docker compose down
```

### 3. Open the Testnet example

A public Testnet link is not available in this implementation yet. Only use a `NEAR Testnet` link after the operator has published one with matching, final issue/revoke evidence and a verified explorer link.

## Checks

Install pinned toolchains from `rust-toolchain.toml`, then run:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm test:e2e
cargo fmt --manifest-path backend/contract/Cargo.toml --check
cargo clippy --locked --manifest-path backend/contract/Cargo.toml --all-targets -- -D warnings
cargo test --locked --manifest-path backend/contract/Cargo.toml
cargo near build non-reproducible-wasm --locked --manifest-path backend/contract/Cargo.toml
docker compose config
docker compose --env-file .env.example -f compose.vps.yaml config
```

For sample E2E, install the pinned Playwright browsers and run the root E2E command. It builds and serves Vite on loopback. To test the actual Judge deployment, start Compose first and run:

```sh
EVA_E2E_ORIGIN=http://127.0.0.1:8080 EVA_E2E_MODE=sandbox pnpm test:e2e
```

To verify offline startup, build both images before disconnecting. Use a temporary Compose override with an internal default network, then start with up --no-build --pull never. Docker can suppress host publishing on an internal network. Run Playwright with --network container:<frontend-container> so the browser reaches Caddy at 127.0.0.1:8080 and retains a secure context. Check that an outbound request from each service fails. Use down with the same project and Compose files.

The [operator runbook](docs/operator.md) covers the release WASM, CLI, VPS and Testnet verification.

## Runtime and trust

The public verifier reads a final record from the configured contract and checks the payload signature locally. A contract commitment binds the exact canonical payload bytes. A `VALID` result proves that the configured issuer key signed this statement and the selected registry still marks it active. It does not independently prove the agency's identity, the courier's identity, the truth of the claim, or the client's consent. A URL fragment is visible to its holder and is not encrypted.

The local Sandbox and sample are separate from Testnet. There is no deployed Testnet contract, published reference, verified explorer link, VPS, or public-network evidence in this source checkout.

## Reproducibility

See [`docs/product.md`](docs/product.md) for the product contract, P0–P4 sequence, acceptance criteria, and release procedure. The implementation uses React/Vite, Fastify, `near-api-js`, `near-sandbox`, Rust `near-sdk`, and the official `cargo-near` scaffold. Dependency and runtime versions are pinned by manifests, lockfiles, and digests. This repository was created during the NEAR HACKATHON window; no prior EVA code is claimed as new integration work.
