# EVA

**Verify the work. Keep the client confidential.**

[Live app](https://evalabs.my.id) · [Judge demo](#judge-demo) · [Verification evidence](#near-testnet)

NEAR Testnet contract `eva-reference-wallet-261113.testnet`

Demo video pending recording.

## What EVA is

EVA lets an agency use its NEAR wallet to issue a verifiable contribution reference for freelance work covered by an NDA or other confidentiality agreement. Recruiters can check the approved wording, the issuing account, and whether the reference is still active against NEAR Testnet. Client identity and project files can stay with the agency.

## Problem

Freelancers can do meaningful work under NDA and still be unable to show it in a portfolio. A self-written CV claim is hard for a recruiter to check. EVA gives the agency a way to approve one shareable statement while keeping the project private.

## How it works

**Freelancer → Agency → NEAR Registry → Recruiter**

1. The freelancer drafts one contribution request and sends it to their existing agency contact.
2. The agency approves the wording and issues the reference with its NEAR wallet.
3. EVA records a SHA-256 commitment for the canonical reference payload on NEAR.
4. The freelancer shares the generated link.
5. The recruiter opens the link and verifies the issuing account and current status without a wallet.
6. The agency can permanently revoke the reference. The same link then shows `REVOKED`.

## Why EVA is different

- An agency can endorse one contribution without naming the client or uploading project files.
- Recruiters can check a shared link without an account or wallet.
- The issuing wallet's NEAR transaction establishes ownership of the record. The same link can be checked against final on-chain state after revocation.

## Why NEAR

The agency's wallet authorizes issuance. The contract keys each record by reference ID and stores only the issuing account, the payload commitment, and the revocation flag. Public issuance pays for the storage it adds, and only the issuing account can revoke its record. The verifier reads final state from the configured NEAR contract and compares the issuer and commitment with the link.

## Judge demo

The two links below open synthetic NEAR Testnet references. You can follow this path without connecting a wallet or sending a new transaction.

1. Open the [live EVA app](https://evalabs.my.id).
2. Click **Open EVA**.
3. Review the Freelancer, Agency, and Recruiter roles.
4. Open **Agency** to see the NEAR wallet issuance workflow.
5. Open the [active Testnet reference](https://evalabs.my.id/verify#r=WyJldmE6cmVmZXJlbmNlOnYyIiwidGVzdG5ldCIsImV2YS1yZWZlcmVuY2Utd2FsbGV0LTI2MTExMy50ZXN0bmV0IiwiZXZhLWlzc3Vlci0yNjExMTMudGVzdG5ldCIsImZhMThkZjQzYWJiMDI0MTlkM2RhYjQ2NmI2NWFmYWNjIiwidW1EalRYa0hhRllDR0hBNjdOUzg1aTZWbkExS0hCcWNqa2dmZ3pYX1JPZyIsIkFsZXggTW9yZ2FuIiwiRGVzaWduZWQgdGhlIGNoZWNrb3V0IGZsb3cgZm9yIGEgc3ludGhldGljIHN0b3JlZnJvbnQuIl0) and check for `VALID`.
6. Open the [revoked Testnet reference](https://evalabs.my.id/verify#r=WyJldmE6cmVmZXJlbmNlOnYyIiwidGVzdG5ldCIsImV2YS1yZWZlcmVuY2Utd2FsbGV0LTI2MTExMy50ZXN0bmV0IiwiZXZhLWlzc3Vlci0yNjExMTMudGVzdG5ldCIsIjlhMjEwNmFhOTQzYzZjYjVhZjkxNWU4YmM4YjU1NWVlIiwiY1A3SWNtbFR3X3dVeGstNTEzblNCNVpfdkZMYks5d29POFNHbkNWa0hPVSIsIk1heWEgQ2hlbiIsIlJldmlld2VkIGFjY2Vzc2liaWxpdHkgZm9yIGEgc3ludGhldGljIHN0b3JlZnJvbnQuIl0) and check for `REVOKED`.
7. Expand **Verification details** to see the issuing account and final block.

[60–90 second walkthrough and narration](docs/DEMO.md)

## Architecture

| Layer | Responsibility |
| --- | --- |
| React/Vite frontend | Role flows, wallet UI, and reference verification |
| NEAR Connect | Agency wallet connection and transaction signing |
| NEAR contract | Per-reference issuer ownership, payload commitment, and revocation state |
| Fastify backend | Trusted network and contract profile, and final NEAR reads |
| Local NEAR Sandbox | Reproducible judge path without an external wallet |
| Caddy / Docker Compose | Public serving and local judge deployment |

## Verified evidence

### NEAR Testnet

The release used Meteor Wallet 0.8.12 to issue synthetic references and revoke one of them. A browser without a wallet and independent final reads confirmed that the active link showed `VALID` and that the second link changed from `VALID` to `REVOKED`. The deployed code matches the WASM tested in the Docker Judge image. [Active and revoked examples](#judge-demo)

| Evidence | Value | Final read block (height / hash) |
| --- | --- | --- |
| Release source commit | `90348dac649ce79a1bd27a8163bdf0faa1af342f` | |
| Contract | `eva-reference-wallet-261113.testnet` | |
| Issuer | `eva-issuer-261113.testnet` | |
| WASM SHA-256 | `bb2e0f5853f83a732efb5ee3f5d92d2bafbb1e56f71224639819c17782c79220` | |
| Deploy and initialize | `AAYCNafhyS8o5c21b5SDPVVB9RntVESD5DAQPvBUSYJx` | `277501290` / `BRPqS8ZG1TuJBhgMgec4rU8o9LMpmc6N5Udu6ievmkXG` |
| Active reference issue | `5A3yyvnmBqsR7AL9R9kSt4PB57VU2f3uDt5zgRubK9L4` | `277617804` / `DowVektMs44EbFWzL6ApnU7NW95R9a5uedVvs3PfdyYT` |
| Revoked reference issue | `9fX8YkzFM1sGJQNzemwBvSZWnT1C5HV849wAwRGPunja` | `277617844` / `8UCN2fBQU8g3vbS5BmrtQ4WT1vVHZxPExTN8C16WZ4sA` |
| Revoke | `H6GBBuiM9aedx8zLSz8FHrdnLNWjKYTKVzrwhu2pjKU3` | `277617883` / `5WEVCWR2fdXwZvC3faZW6vZUCqcATjBdGuqGsHakZTva` |
| Backend image digest | `sha256:b46845a6b13b6f779232c853e269d5a971df81d8832b05704bd1cb4232ca3e17` | |
| Frontend image digest | `sha256:4bde9cbf079f4ddaf8fc65d235f352cbbb3e48adc3900149e7a54858689ae4e2` | |
| `GET /api/ready` | HTTP `200` with `{"ready":true}` | |

## Privacy and limitations

The URL fragment holds the approved name or alias, the contribution wording, and the fields needed for verification. Anyone who receives the link can read the text. Client identity and project files are unnecessary. The NEAR record contains the reference ID, issuer, commitment, and revocation state.

A `VALID` result confirms that the issuing NEAR account recorded a commitment matching the shared payload and that the reference is active. The agency vouches for the claim and is responsible for permission to share it. The recruiter still has to assess whether the work took place. The smart contract has not been independently audited.

## Local demo

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

## Documentation

- [Judge walkthrough and video narration](docs/DEMO.md)
- [Product requirements and post-hackathon roadmap](docs/product.md)
- [Design and status states](docs/design.md)
- [Error reference](docs/errors.md)
- [Operator runbook and Testnet release checks](docs/operator.md#prepare-the-testnet-release)
