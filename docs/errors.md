# Errors

`VALID`, `REVOKED`, `INVALID`, and `UNAVAILABLE` are verifier states. HTTP errors use `{ "code" }`. Sandbox mutations can return HTTP 202 and retain the reference ID.

| Code | Meaning | UI or operator action |
| --- | --- | --- |
| INVALID_INPUT | ID, body, approval, or argument format is invalid | HTTP 400. Correct the input. |
| REQUEST_TOO_LARGE | Request body exceeds 2 KiB | HTTP 413. Shorten the request. |
| UNSUPPORTED_MEDIA_TYPE | A local mutation requires JSON | HTTP 415. Use the local issue form. |
| INVALID_LINK | Fragment is missing, malformed, or unsupported | `INVALID`. Reopen the original link. |
| PROFILE_MISMATCH | Link identifies another network or contract | `INVALID`. Open the link on its configured origin. |
| ISSUER_MISMATCH | Payload issuer differs from the owner of the final record | `INVALID`. Ask the issuer for the original link. |
| COMMITMENT_MISMATCH | Payload bytes do not match the final record | `INVALID`. Ask the issuer for the original link. |
| REFERENCE_NOT_FOUND | A final read returned no record | HTTP 404. The verifier shows `INVALID`. |
| REFERENCE_REVOKED | An issue tried to reuse a revoked ID | Sandbox issue returns HTTP 409. Verification shows `REVOKED` when both integrity checks pass. |
| REFERENCE_CONFLICT | The ID belongs to another issuer or commitment | Sandbox issue returns HTTP 409. Resolve the conflict before issuing. |
| INSUFFICIENT_DEPOSIT | The attached deposit does not cover new record storage | The contract reverts the issue transaction. Sandbox returns HTTP 500 if its configured deposit is insufficient. |
| ISSUE_PENDING | The local issue has not been confirmed | HTTP 202. Check final status and keep the same ID on retry. |
| REVOKE_PENDING | The local revoke has not been confirmed | HTTP 202. Read final state before retrying. |
| FORBIDDEN | The caller does not own the record or the Sandbox request origin is unauthorized | Use the issuing wallet or configured local origin. |
| CAP_REACHED | The in-memory Sandbox intent limit has been reached | HTTP 409. Start a fresh Sandbox session when ready to discard its local data. |
| UNAVAILABLE | The RPC, configuration, final response, or Web Crypto check failed | HTTP 503 or verifier state. Retry the status check. |
| ROUTE_NOT_FOUND | The route is unavailable in this mode | HTTP 404. Return to a supported screen. |

Agency distinguishes wallet rejection, reported transaction failure, submitted transactions awaiting final state, and unknown outcomes. A wallet response alone does not establish issuance or revocation. For an uncertain result, check the final record before retrying the same action.
