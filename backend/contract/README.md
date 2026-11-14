# Reference contract

The registry stores the caller’s NEAR account, a salted payload commitment, and a revocation flag per reference ID. The caller pays for new storage and receives any excess deposit back. Only the stored issuer can permanently revoke its record. Anyone can read a record.

Run from the repository root with Rust 1.99.1 and cargo-near 0.23.0.

```sh
cargo test --locked --manifest-path backend/contract/Cargo.toml
cargo near build non-reproducible-wasm --locked --manifest-path backend/contract/Cargo.toml
```

See [the contract specification](../../docs/product.md) for the interface and state transitions. See [the operator runbook](../../docs/operator.md) for release WASM extraction and approved Testnet provisioning.
