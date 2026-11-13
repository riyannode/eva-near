# Testnet operator runbook

Run provisioning and mutations only after the owner authorizes the public stage. Keep the contract deployment full-access key and issuer account full-access key in their provisioning keychains. The VPS receives only the public settings in .env.example. Use Node 26.13.1, pnpm 12.18.0, and near-cli-rs 0.31.1.

## Prepare the release

1. Build the Judge image on linux/amd64. Extract the exact WASM from that image, then hash it locally and again on the provisioning machine.

   ```sh
   docker compose build backend
   docker compose run --rm --no-deps -T backend cat /app/reference.wasm > reference.wasm
   sha256sum reference.wasm
   ```

2. Provision distinct funded contract and issuer accounts on Testnet with near-cli-rs. Inspect the selected RPC with `status` and confirm its chain ID is `testnet`. Check the account balances and the current `storage_amount_per_byte` from protocol configuration. For 1,024 records, budget at least 115,712 incremental bytes based on the measured 113-byte Sandbox record, plus contract code and state, gas, and a margin. Re-measure on the release network and record the balance and storage delta.
3. Generate an Ed25519 payload key on the operator device and protect the private PKCS#8 file. Derive the public key as raw 32-byte base64url for `issuer_key`.

   ```sh
   umask 077
   openssl genpkey -algorithm ED25519 -out "$ISSUER_KEY_FILE"
   node --input-type=module -e 'import {readFileSync} from "node:fs"; import {createPublicKey} from "node:crypto"; console.log(createPublicKey(readFileSync(process.env.ISSUER_KEY_FILE)).export({format:"jwk"}).x)'
   ```

4. Construct `EVA_INIT_ARGS` with `issuer_id` and `issuer_key`. Deploy and initialize atomically from the contract account. Inspect the transaction and its receipts.

   ```sh
   near contract deploy "$NEAR_CONTRACT_ID" use-file reference.wasm \
     with-init-call init json-args "$EVA_INIT_ARGS" prepaid-gas '30 TGas' \
     attached-deposit '0 NEAR' network-config testnet sign-with-keychain send
   ```

5. Generate a separate NEAR transaction key on the operator device. Save its secret as `{"private_key":"<operator-generated NEAR key>"}` in `NEAR_TX_KEY_FILE` with mode 0600. Register only its public key, with finite allowance and the two specified methods. Inspect the resulting key with `near account list-keys`.

   ```sh
   near account add-key "$NEAR_ISSUER_ID" grant-function-call-access \
     --allowance "$EVA_ALLOWANCE" --contract-account-id "$NEAR_CONTRACT_ID" \
     --function-names 'issue,revoke' use-manually-provided-public-key "$EVA_TX_PUBLIC_KEY" \
     network-config testnet sign-with-keychain send
   ```

## Operate and recover

Export the public environment variables from the approved release configuration and the two local key-file paths. Keep requests, pending envelopes and results in a private directory outside the checkout. Create a request file with `subject`, `claim`, and `approved: true`.

```sh
pnpm --filter @eva/backend run reference issue "$REQUEST_FILE" "$OUTPUT_FILE"
pnpm --filter @eva/backend run reference resume "$OUTPUT_FILE.pending" "$OUTPUT_FILE"
pnpm --filter @eva/backend run reference revoke "$REFERENCE_ID"
```

Use `resume` if the first issue left a pending file. It preserves the original ID, payload, signature and commitment. If the chosen output already exists, inspect it locally before using a fresh output path. Verify a transaction hash by querying the RPC for the transaction with `wait_until: FINAL`, then read `get_reference` with `finality: final`. For an uncertain revoke, repeat the revoke command with the same ID. It checks final state before attempting another write.

## Serve and verify

Place only public configuration in the VPS environment. Route TLS at the existing reverse proxy to the loopback port published by `compose.vps.yaml`. Confirm liveness, readiness, the CSP and cache headers, and 404 for `/issue` and all `/api/demo/*` routes. Roll back to the prior compatible application image if needed. Keep the contract and its registry in place.

### Dedicated EVA edge

`compose.edge.yaml` places a separate Caddy in front of the EVA frontend. The edge and the frontend share a Docker network. The backend stays on the application network. Only the edge publishes a loopback port. It serves the configured `EVA_HOST` and returns 404 for other hostnames.

Set `EVA_HOST` to the hostname without a scheme or port. Set `PUBLIC_ORIGIN` to its full HTTPS origin. Set `EVA_PORT` only to override the loopback port. Validate and start the two Compose files together.

```sh
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml config --quiet
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml up -d --build
curl --fail --header "Host: $EVA_HOST" http://127.0.0.1:${EVA_PORT:-8080}/api/health
```

For a public HTTPS deployment, point an authorized ingress at the edge and preserve the configured hostname in `Host`. With a Cloudflare Tunnel, map the public hostname to `http://127.0.0.1:8080` when `cloudflared` runs on the VPS host. If the connector runs in Docker on the edge network, use `http://edge:8080` and set the origin Host header to `EVA_HOST` if needed. Confirm `/`, `/verify`, `/api/health` and `/api/ready` on the public origin, then check `/issue` and `/api/demo/*` return 404. DNS and ingress are provisioned separately.

For the deployed Cloudflare Tunnel, store the connector token outside the checkout at `/opt/eva-near/secrets/tunnel-token`. On a standard rootful Docker host, set file ownership to `65532:65532` and permissions to `0400` so the connector process can read it. Keep the parent directory restricted. Cloudflare routes the public hostname to `http://edge:8080` with the configured EVA host header. Add the tunnel override to the same Compose project.

```sh
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml -f compose.tunnel.yaml config --quiet
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml -f compose.tunnel.yaml up -d
```

Bring down the stack using the same project name and the overrides used to start it.

```sh
docker compose -p eva-near -f compose.vps.yaml -f compose.edge.yaml down
```

Independently check a record with a NEAR JSON-RPC `query` using `request_type: call_function`, `account_id` set to the configured contract, `method_name: get_reference`, `finality: final`, and `args_base64` containing UTF-8 JSON `{"reference_id":"<id>"}`. Decode the result bytes as JSON and compare the issuer key, commitment, and revocation flag. Keep the share fragment off RPC requests and release logs.

Approve two synthetic links for the README after confirming one active and one revoked. Use a third link to record VALID → REVOKED at the same URL. Record release commit, image digests, SHA-256 of the deployed WASM, contract and issuer accounts, transaction hashes, and final view blocks. Check explorer links before publication. Keep the old verifier origin available if its links must remain verifiable after any future issuer or contract change.


## Private agency pilot

The pilot pairs one freelancer with one agency operator. Enable it only for a workspace where both participants have agreed to share the request text. Give each participant their own code through a private channel. Every request in that workspace is visible to those two participants. Use a separate deployment and data directory for another pairing.

1. Set `PILOT_DATA_DIR` to an absolute host directory writable by container UID 1000. Keep directory permissions at `0700` and restrict access to its backups. The SQLite file contains the freelancer's name or alias, contribution, and decision. Keep the data and its backups outside the repo. Preserve the directory across restarts.
2. Generate distinct random codes with at least 32 random bytes each. The values must use the base64url alphabet. Set `PILOT_FREELANCER_CODE` and `PILOT_AGENCY_CODE` in a private environment file with mode `0600`. Keep the existing public Testnet settings there as well. Use `config --quiet` to avoid printing interpolated values.
3. Add `compose.pilot.yaml` to the approved VPS Compose file list. The example uses the loopback frontend. When using the dedicated edge and tunnel, keep their overlays in the command and preserve the configured HTTPS host at ingress.

   ```sh
   docker compose --env-file /path/to/private-pilot.env -f compose.vps.yaml -f compose.pilot.yaml config --quiet
   docker compose --env-file /path/to/private-pilot.env -f compose.vps.yaml -f compose.pilot.yaml up -d --build
   ```

4. On the configured HTTPS origin, open `/freelancer` with the freelancer code, submit a synthetic contribution, and confirm it appears in `/agency` with the agency code. Decide on the request and reload both pages to confirm the decision. Repeat after restarting the backend to verify persistence. Check that an incorrect code and an attempt to act as the other role are rejected.
5. After an approval, prepare the approved request file on the operator device and follow [Operate and recover](#operate-and-recover). Share the resulting reference through the agreed private channel. Test verifications at `/verify` and keep issuance receipts separate from inbox decisions.

The normal Testnet and Judge Compose commands omit the pilot overlay. To disable the pilot, recreate the backend without that overlay and verify that `/api/pilot/requests` returns 404. Keep the private data directory for the agreed retention period.

## Revoke with a Testnet wallet

On `/agency/wallet`, choose a NEAR Connect-compatible Testnet browser extension. Connect the configured issuer account and paste its EVA reference. After EVA displays `VALID`, open **Revoke this reference** and approve in your wallet. The contract receives only the reference ID. Check the final status before attempting another transaction. The verifier reads `REVOKED` on the same link. The CLI remains the recovery path and still issues v1 references. The wallet connection uses an injected extension and requests no access key during sign-in.
