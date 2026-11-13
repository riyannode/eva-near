# EVA

EVA publishes agency-approved contribution references for confidential projects. `backend/`, `frontend/`, and `docs/` are the three root folders. Use `reference`, `issuer`, `claim`, and `commitment` in domain names.

## Read before changing

- Product, wire format, contract, Docker, or release changes: read `docs/product.md` and run relevant acceptance checks.
- UI, copy, keyboard, or motion changes: read `docs/design.md` and inspect the served build.
- New errors, RPC mapping, or status changes: read `docs/errors.md` and update its mapping.

## Work

1. State assumptions and verifiable outcomes. Follow P0–P4 in `docs/product.md` for multi-stage work.
2. Read callers and invariants. Keep format rules in `reference`, issuer policy in `issuer` and the contract, and RPC access in `near`.
3. Prefer standard APIs and keep each file focused. Preserve status ordering, privacy, and authorization.
4. Use synthetic data. Label evidence `Sample data`, `Local NEAR Sandbox`, or `NEAR Testnet` accurately.

## Review and authorization

Review correctness, access, privacy, evidence, and unnecessary wrappers. Do not deploy, publish, commit, push, broadcast transactions, or submit a hackathon application without the owner's separate authorization. Keep operator keys and private envelopes on the operator device.
