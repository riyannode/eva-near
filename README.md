# EVA

**Verify the work. Keep the client confidential.**

EVA lets an agency approve one contribution from a confidential project for a freelancer to share. A recruiter can check who issued the reference and whether it is still active.

Choose **Open EVA** on the homepage and pick a role.

| Role | What to do |
| --- | --- |
| Freelancer | Prepare a reference request and copy it to the agency contact you already use. |
| Agency | Connect a compatible NEAR Testnet wallet, review the wording, and approve the issue transaction. Copy the link after EVA confirms the final record. Open a saved reference and use the issuing wallet to revoke it. |
| Recruiter | Open the shared link or paste it into the verifier. No account or wallet is needed. |

## Three ways to try EVA

### Sample data

Open `/demo` and choose **Valid**, **Revoked**, or **Edited**. The guided walkthrough simulates issue and revoke on the same browser sample. The **Sample data** label identifies these results.

### Local NEAR Sandbox

Use Docker Engine with Compose on `linux/amd64` and internet access for the first build.

```sh
docker compose up
```

Open [the local demo](http://127.0.0.1:8080/demo) and follow the link to `/issue`. Approve the synthetic claim, issue it, and open the generated link to see `VALID`. Revoke it on the issue page and refresh the same link to see `REVOKED`. Docker uses a real contract on **Local NEAR Sandbox** with a local signer. Restarting Sandbox clears its records.

```sh
docker compose down
```

### NEAR Testnet

Public evidence for this registry is pending the approved release. The Testnet demo begins on `/agency` with a wallet-funded synthetic reference. Open the link as a recruiter to verify `VALID`, revoke with the same account, then verify `REVOKED` on the same link. The [operator runbook](docs/operator.md#prepare-the-testnet-release) specifies the release checks and evidence to publish.

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
EVA_HOST=eva.example.invalid docker compose --env-file .env.example -f compose.vps.yaml -f compose.edge.yaml -f compose.tunnel.yaml config
```

For sample E2E, install the pinned Playwright browsers and run the root E2E command. It builds and serves Vite on loopback. To test the actual Judge deployment, start Compose first and run:

```sh
EVA_E2E_ORIGIN=http://127.0.0.1:8080 EVA_E2E_MODE=sandbox pnpm test:e2e
```

To verify offline startup, build both images before disconnecting. Use a temporary Compose override with an internal default network, then start with up --no-build --pull never. Docker can suppress host publishing on an internal network. Run Playwright with --network container:<frontend-container> so the browser reaches Caddy at 127.0.0.1:8080 and retains a secure context. Check that an outbound request from each service fails. Use down with the same project and Compose files.

## What the verifier checks

The link fragment contains the approved name or alias, one claim, and the fields needed to verify it. Anyone with the link can read it. NEAR stores the issuer account, a commitment to the salted payload, and the revocation flag. The verifier uses the configured network and contract, reads the record at finality, and checks that both the issuer account and SHA-256 commitment match the link. The agency is responsible for the accuracy of the claim and permission to share it. The recruiter evaluates who controls the issuer account and the credibility of the claim.

[Product requirements and roadmap](docs/product.md) · [Design](docs/design.md) · [Operator runbook](docs/operator.md)
