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

The released registry was exercised with Meteor Wallet 0.8.12 using synthetic references. A walletless browser and independent final reads verified the outcomes:

- [Active reference](https://evalabs.my.id/verify#r=WyJldmE6cmVmZXJlbmNlOnYyIiwidGVzdG5ldCIsImV2YS1yZWZlcmVuY2Utd2FsbGV0LTI2MTExMy50ZXN0bmV0IiwiZXZhLWlzc3Vlci0yNjExMTMudGVzdG5ldCIsImZhMThkZjQzYWJiMDI0MTlkM2RhYjQ2NmI2NWFmYWNjIiwidW1EalRYa0hhRllDR0hBNjdOUzg1aTZWbkExS0hCcWNqa2dmZ3pYX1JPZyIsIkFsZXggTW9yZ2FuIiwiRGVzaWduZWQgdGhlIGNoZWNrb3V0IGZsb3cgZm9yIGEgc3ludGhldGljIHN0b3JlZnJvbnQuIl0) — `VALID` after issue.
- [Revoked reference](https://evalabs.my.id/verify#r=WyJldmE6cmVmZXJlbmNlOnYyIiwidGVzdG5ldCIsImV2YS1yZWZlcmVuY2Utd2FsbGV0LTI2MTExMy50ZXN0bmV0IiwiZXZhLWlzc3Vlci0yNjExMTMudGVzdG5ldCIsIjlhMjEwNmFhOTQzYzZjYjVhZjkxNWU4YmM4YjU1NWVlIiwiY1A3SWNtbFR3X3dVeGstNTEzblNCNVpfdkZMYks5d29POFNHbkNWa0hPVSIsIk1heWEgQ2hlbiIsIlJldmlld2VkIGFjY2Vzc2liaWxpdHkgZm9yIGEgc3ludGhldGljIHN0b3JlZnJvbnQuIl0) — `VALID` after issue, then `REVOKED` on the same link after revocation.

Release evidence:

- Release commit: `90348dac649ce79a1bd27a8163bdf0faa1af342f`. Tested Judge WASM and deployed on-chain code share SHA-256 `bb2e0f5853f83a732efb5ee3f5d92d2bafbb1e56f71224639819c17782c79220`.
- Contract: `eva-reference-wallet-261113.testnet`; issuer: `eva-issuer-261113.testnet`.
- Deployment transaction: `AAYCNafhyS8o5c21b5SDPVVB9RntVESD5DAQPvBUSYJx`; final read block: `277501290` / `BRPqS8ZG1TuJBhgMgec4rU8o9LMpmc6N5Udu6ievmkXG`.
- Active issue transaction: `5A3yyvnmBqsR7AL9R9kSt4PB57VU2f3uDt5zgRubK9L4`; final read block: `277617804` / `DowVektMs44EbFWzL6ApnU7NW95R9a5uedVvs3PfdyYT`.
- Second issue transaction: `9fX8YkzFM1sGJQNzemwBvSZWnT1C5HV849wAwRGPunja`; final read block: `277617844` / `8UCN2fBQU8g3vbS5BmrtQ4WT1vVHZxPExTN8C16WZ4sA`.
- Revoke transaction: `H6GBBuiM9aedx8zLSz8FHrdnLNWjKYTKVzrwhu2pjKU3`; final read block: `277617883` / `5WEVCWR2fdXwZvC3faZW6vZUCqcATjBdGuqGsHakZTva`.
- Deployed backend image digest: `sha256:b46845a6b13b6f779232c853e269d5a971df81d8832b05704bd1cb4232ca3e17`; frontend image digest: `sha256:4bde9cbf079f4ddaf8fc65d235f352cbbb3e48adc3900149e7a54858689ae4e2`. `GET /api/ready` returned HTTP `200` with `{"ready":true}`.

The Testnet flow begins on `/agency`. The [operator runbook](docs/operator.md#prepare-the-testnet-release) describes release checks.

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
