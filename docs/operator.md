# Testnet operator runbook

## Prepare the Testnet release

Run these steps after approval for the public release. Use synthetic names and contributions.

1. Record the reviewed Git commit and validate that checkout. Build the Judge image and extract the WASM it runs. Hash that exact file and keep it with the release evidence.

   ```sh
   git rev-parse HEAD
   docker compose build backend
   image=$(docker compose images -q backend)
   ```

   If the Compose stack is stopped, use the backend image ID from the successful build. Use a temporary container to extract the artifact.

   ```sh
   container=$(docker create "$image")
   docker cp "$container:/app/reference.wasm" ./reference.wasm
   docker rm "$container"
   sha256sum reference.wasm
   ```

   Confirm the bytes were tested by running the Judge issue, verify, and revoke checks on that image. Use the extracted file for deployment.

2. Provision and fund a fresh Testnet contract account. Prepare a funded Testnet account in Meteor Wallet or a compatible injected NEAR Connect wallet for Agency issuance. Allow for gas and the 0.01 NEAR issue deposit. The contract refunds the portion above its measured storage cost. Keep the contract account credentials in the operator keychain and the Agency credentials in its wallet.
3. Set `NEAR_CONTRACT_ID` to the new contract account. Deploy and initialize from that account using the tested artifact. Check the deploy transaction and its execution receipts.

   ```sh
   near contract deploy "$NEAR_CONTRACT_ID" use-file reference.wasm \
     with-init-call init json-args '{}' prepaid-gas '30 TGas' \
     attached-deposit '0 NEAR' network-config testnet sign-with-keychain send
   ```

4. Set `NEAR_RPC_URL` to the approved HTTPS Testnet RPC, `NEAR_CONTRACT_ID` to the deployed account, and `PUBLIC_ORIGIN` to the approved HTTPS origin. Confirm the RPC reports `testnet`. Validate the VPS Compose config and serve the approved build as described below. Check `/api/config`, `/api/health`, and `/api/ready`.
5. On `/agency`, connect the funded account, review and approve a synthetic claim, and sign **Issue reference**. After the final read, copy the link. Open it in a separate walletless browser session and confirm **NEAR Testnet** and `VALID`. Keep this sample active.
6. Issue a second synthetic reference. Verify `VALID` on its link. Revoke with the same account and check the final status. Refresh the same recruiter link and confirm `REVOKED`.
7. Verify the final record independently for each issue and revoke. Record the contract and issuer account IDs, release commit, deployed WASM SHA-256, transaction hashes for deploy/init, both issues and revoke, and final block heights and hashes. Use the wallet activity and the deploy receipt to obtain transaction hashes. Record deployed image digests. After checking explorer links and getting approval for both synthetic payloads, add the active and revoked share links and release evidence to the README.

## Check final status

Query NEAR JSON-RPC with `request_type: call_function`, `account_id` set to the configured contract, `method_name: get_reference`, `finality: final`, and `args_base64` containing UTF-8 JSON `{"reference_id":"<id>"}`. Decode the returned byte array as JSON and compare the issuer account, commitment, and revocation flag. A `null` result means no record exists at that block. Keep share fragments out of RPC requests and logs.

If a wallet request is uncertain, check final state before retrying. Keep the same pending payload and reference ID during an issue retry. For a reference already shared, paste the saved link into Agency and connect the issuing account to check or revoke it. Keep the Agency tab open while a transaction is pending. Pending issuance is held in page memory.

## Serve and verify

Place public configuration in the VPS environment. Route TLS at the approved reverse proxy to the loopback port published by `compose.vps.yaml`. Confirm the CSP and cache headers. The Testnet Agency pages use a fresh script nonce for the sandboxed Meteor Wallet adapter. Its source is pinned and checksum-verified at image build. The adapter uses FastNEAR Testnet RPC to prepare wallet transactions. Open `/agency` and `/verify`, then check that `/issue` and `/api/demo/*` return 404.

### Dedicated EVA edge

`compose.edge.yaml` places a separate Caddy in front of the EVA frontend. The edge and the frontend share a Docker network. The backend stays on the application network. Only the edge publishes a loopback port. It serves the configured `EVA_HOST` and returns 404 for other hostnames.

Set `EVA_HOST` to the hostname without a scheme or port. Set `PUBLIC_ORIGIN` to its full HTTPS origin. Set `EVA_PORT` only to override the loopback port. Validate and start the two Compose files together.

```sh
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml config --quiet
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml up -d --build
curl --fail --header "Host: $EVA_HOST" http://127.0.0.1:${EVA_PORT:-8080}/api/health
```

For a public HTTPS deployment, point an authorized ingress at the edge and preserve the configured hostname in `Host`. With a Cloudflare Tunnel, map the public hostname to `http://127.0.0.1:8080` when `cloudflared` runs on the VPS host. If the connector runs in Docker on the edge network, use `http://edge:8080` and set the origin Host header to `EVA_HOST` if needed. Confirm `/`, `/verify`, `/api/health` and `/api/ready` on the public origin, then check `/issue` and `/api/demo/*` return 404. DNS and ingress are provisioned separately.

When using a Cloudflare Tunnel, store the connector token outside the checkout at `/opt/eva-near/secrets/tunnel-token`. On a standard rootful Docker host, set file ownership to `65532:65532` and permissions to `0400` so the connector process can read it. Keep the parent directory restricted. Cloudflare routes the public hostname to `http://edge:8080` with the configured EVA host header. Add the tunnel override to the same Compose project.

```sh
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml -f compose.tunnel.yaml config --quiet
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml -f compose.tunnel.yaml up -d
```

Bring down the stack using the same project name and the overrides used to start it.

```sh
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml -f compose.tunnel.yaml down
```
