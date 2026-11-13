# Errors

`VALID`, `REVOKED`, `INVALID`, and `UNAVAILABLE` are verifier states. HTTP errors use `{ "code" }`. Pending mutations use HTTP 202 and retain the same reference ID.

| Code | Meaning | UI / operator action |
| --- | --- | --- |
| INVALID_INPUT | ID, body, approval, or argument format is invalid | HTTP 400. Correct the input. |
| REQUEST_TOO_LARGE | Request body exceeds 2 KiB | HTTP 413. Shorten the request. |
| UNSUPPORTED_MEDIA_TYPE | A local mutation did not use JSON | HTTP 415. Use the local issue form. |
| INVALID_LINK | Fragment is missing, malformed, or unsupported | `INVALID`. Reopen the original link. |
| PROFILE_MISMATCH | Link identifies another network, contract, or issuer | `INVALID`. Open it on its configured origin. |
| SIGNATURE_INVALID | Signature does not match the trusted issuer key | `INVALID`. Ask the issuer for the original link. |
| COMMITMENT_MISMATCH | Payload does not match the final record | `INVALID`. Ask the issuer for the original link. |
| REFERENCE_NOT_FOUND | Final view from the expected contract returned no record | HTTP 404; verifier shows `INVALID`. |
| REFERENCE_REVOKED | Record is revoked or an issue retries a revoked ID | Verifier shows `REVOKED` only after integrity checks; issue returns HTTP 409. |
| REFERENCE_CONFLICT | Active ID is bound to a different commitment | HTTP 409. Stop retrying and inspect the pending file. |
| PILOT_DECISION_CONFLICT | A different final decision is already recorded for this request | HTTP 409. Reload the inbox to see the saved decision. |
| ISSUE_PENDING | Issue has not been confirmed | HTTP 202. Check status or resume with the same ID. |
| REVOKE_PENDING | Revoke has not been confirmed | HTTP 202. Read final state before retry. |
| FORBIDDEN | Caller, origin, or account is not authorized | HTTP 403. Check the active mode, issuer account, or private pilot access code. |
| CAP_REACHED | 1024 records already exist | HTTP 409. Provision a new deployment. |
| UNAVAILABLE | RPC timeout, malformed response, configuration mismatch, or unavailable Web Crypto | HTTP 503 or verifier state. Retry or inspect runtime configuration. |
| ROUTE_NOT_FOUND | Route is not available in the active mode | HTTP 404. Return to a supported screen. |

Bootstrap errors identify only the failed step. Logs, RPC responses, stack traces, and CLI errors are sanitized. A failed live status read is never replaced by sample data or a stale result.
