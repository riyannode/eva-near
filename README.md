# EVA

**Verify the work. Keep the client confidential.**

EVA gives a recruiter one agency-signed contribution statement to verify. The share link contains the approved name or alias and one claim. The contract stores a salted commitment to that claim and its revocation status. Client names and project files stay out of the flow. The agency is responsible for its approval and reputation.

## Try it

### 1. Use the live Testnet verifier

Open EVA and choose **Verify a reference**, then paste a link from an issuer. A direct reference link opens the same verifier. It checks the claim and reads the current status from NEAR Testnet without a wallet. [Open EVA](https://evalabs.my.id/)

Try these two synthetic references. Open **Verification details** to see the issuer, contract, and final block.

- [VALID reference](https://evalabs.my.id/verify#r=WyJldmE6cmVmZXJlbmNlOnYxIiwidGVzdG5ldCIsImV2YS1yZWZlcmVuY2UtMjYxMTEzLnRlc3RuZXQiLCJldmEtaXNzdWVyLTI2MTExMy50ZXN0bmV0IiwiN2RhMjkyYmQ1ZWVkM2E3ZWQ4NjQwZjQ2N2RlNTVhN2QiLCJqbXUydlV6eklXeDh4QmY2SUNVVGFfTDZGcmt0dk9qQVdyYkVYbkZ0RDVzIiwiQWxleCBNb3JnYW4iLCJEZXNpZ25lZCB0aGUgY2hlY2tvdXQgZmxvdyBmb3IgYSBkZW1vIGUtY29tbWVyY2UgcHJvamVjdC4iXQ.6LybvkLkV0A0fNpl-luwYDTdOZNiBjRk6HGF-VE8E2y_1dGlWhT34g_OopUMZjXgfTw_Ta399bUJh710uh4_BA)
- [REVOKED reference](https://evalabs.my.id/verify#r=WyJldmE6cmVmZXJlbmNlOnYxIiwidGVzdG5ldCIsImV2YS1yZWZlcmVuY2UtMjYxMTEzLnRlc3RuZXQiLCJldmEtaXNzdWVyLTI2MTExMy50ZXN0bmV0IiwiNzI3MTBlNjAwNTNmODkxZjdkNzBiMjk1ODYxNzk2OWEiLCIxdjlIQmxYMGFlMHRmRHZnZmRqQloydU1XODJiSWM3UG1hN1FqTTFualNFIiwiVGF5bG9yIEJyb29rcyIsIkJ1aWx0IGFuIGFjY2Vzc2liaWxpdHkgY2hlY2tsaXN0IGZvciBhIGRlbW8gc3RvcmVmcm9udC4iXQ.T1R2qLRRtQPRux0svkRzLOkpyD8EoHY-0GkzkoltqRnhrZFwZOKn3R_0oTqNva7sxuynpix2bNBXqRPsjMDWAA)

Freelancers can prepare a reference request on the homepage and copy it to send to the agency they worked with. The configured agency approves the claim, issues the signed link, and can revoke it with the local operator CLI. [Operator instructions](docs/operator.md)

### 2. Try the browser demo

Open the demo and choose **Valid**, **Revoked**, or **Edited** to see the three verification outcomes. In the guided walkthrough, choose **Simulate sample issue**, **Open sample reference**, then **Simulate sample revoke**. The same sample changes from `VALID` to `REVOKED`. The walkthrough uses **Sample data** in the browser. [Open the interactive demo](https://evalabs.my.id/demo)

### 3. Issue and revoke in Docker

Use Docker Engine with Compose, `linux/amd64`, and internet access for the first build.

```sh
docker compose up
```

Open [the local demo](http://127.0.0.1:8080/demo) and choose **Issue a reference**. Approve the synthetic claim, issue it, and open the generated link. See `VALID`, revoke it on the issue page, then refresh the same link to see `REVOKED`. The app labels this flow **Local NEAR Sandbox**. Restarting the Sandbox clears local records.

```sh
docker compose ps
docker compose down
```

## Testnet deployment

| Field | Value |
| --- | --- |
| Contract | `eva-reference-261113.testnet` |
| Issuer | `eva-issuer-261113.testnet` |
| Contract build source | `8f66e4436039fe20a3ac7ac0898a9827044ffef2` |
| Deployed WASM SHA-256 | `3181a1f0e80efa879aab4ea1cc74e5dc3381a14af361c6d8e135f73620f468ad` |

The deployed WASM matches the artifact tested in the Judge image. The public verifier showed `VALID` and then `REVOKED` on the same third reference link after refresh. [Deploy and init](https://api-testnet.nearblocks.io/v3/txns/FKiWsV986CHqzPSdp8jxXVF5AdjvhKxnZKkFKJuX4YqG) · [Issue](https://api-testnet.nearblocks.io/v3/txns/E8Ls9aKqHRyq3Mh9SmMvpTQRRAWguerBNzaaxNEPdZto) · [Revoke](https://api-testnet.nearblocks.io/v3/txns/DsqZ4ELhb9zuvod113iuky57vC6KnHnqhKauuaDMdv2b)

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
EVA_HOST=evalabs.my.id docker compose --env-file .env.example -f compose.vps.yaml -f compose.edge.yaml -f compose.tunnel.yaml config
```

For sample E2E, install the pinned Playwright browsers and run the root E2E command. It builds and serves Vite on loopback. To test the actual Judge deployment, start Compose first and run:

```sh
EVA_E2E_ORIGIN=http://127.0.0.1:8080 EVA_E2E_MODE=sandbox pnpm test:e2e
```

To verify offline startup, build both images before disconnecting. Use a temporary Compose override with an internal default network, then start with up --no-build --pull never. Docker can suppress host publishing on an internal network. Run Playwright with --network container:<frontend-container> so the browser reaches Caddy at 127.0.0.1:8080 and retains a secure context. Check that an outbound request from each service fails. Use down with the same project and Compose files.

The [operator runbook](docs/operator.md) covers the release WASM, CLI, VPS and Testnet verification.

## Runtime and trust

The public verifier reads a final record from the configured contract and checks the payload signature locally. A contract commitment binds the exact canonical payload bytes. A `VALID` result proves that the configured issuer key signed this statement and the selected registry still marks it active. It does not independently prove the agency's identity, the courier's identity, the truth of the claim, or the client's consent. A URL fragment is visible to its holder and is not encrypted.

If a verification result is unavailable, retry from the same link. If a Sandbox link no longer works after a restart, issue a fresh local reference.

## Reproducibility

See [`docs/product.md`](docs/product.md) for the product contract, P0–P4 sequence, acceptance criteria, and release procedure. The implementation uses React/Vite, Fastify, `near-api-js`, `near-sandbox`, Rust `near-sdk`, and the official `cargo-near` scaffold. Dependency and runtime versions are pinned by manifests, lockfiles, and digests. This repository was created during the NEAR HACKATHON window; no prior EVA code is claimed as new integration work.
