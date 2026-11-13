# Reference contract

The registry stores a salted payload commitment and revocation flag for each reference ID. One configured issuer can issue and permanently revoke references. Anyone can read a record and the issuer's public verification key.

Run from the repository root with Rust 1.99.1 and cargo-near 0.23.0.

```sh
cargo test --locked --manifest-path backend/contract/Cargo.toml
cargo near build non-reproducible-wasm --locked --manifest-path backend/contract/Cargo.toml
```

See [the contract specification](../../docs/product.md) for the interface and state transitions. See [the operator runbook](../../docs/operator.md) for release WASM extraction and approved Testnet provisioning.
