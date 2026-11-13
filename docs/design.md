# Design

## First screen

EVA presents one concise agency reference. The first screen shows `EVA`, the current evidence source, `Verify the work. Keep the client confidential.`, one contribution, the professional alias, `Signed by Studio A`, its state, and `Client name and project files are kept private.` Sample content is always labeled `Sample data`.

## Screens

- `/` shows the valid sample reference immediately and offers text-labeled `Valid`, `Revoked`, and `Edited` examples. In Sandbox it links to `/issue`.
- `/verify` checks the fragment on open. It does not display the claim until local integrity checks and the final registry read finish. `Check again` is available for live modes. A missing fragment explains how to reopen a complete link.
- `/issue` exists only in the local Sandbox mode. It has two labeled fields, a preview, explicit approval, and one submit action. A final result offers `Copy link`, `Open reference`, and `Revoke`. Pending actions retain the same ID.

## Status copy

| Status | Copy | Action |
| --- | --- | --- |
| Checking | Checking the reference… | Keep the card area stable |
| VALID | Reference verified | Check again |
| REVOKED | The agency revoked this reference | Check again |
| INVALID | This link could not be verified | Return to the demo |
| UNAVAILABLE | Verification is unavailable right now | Try again |
| Issue pending | Waiting for NEAR to confirm this reference | Check status |
| Revoke pending | Waiting for NEAR to confirm revocation | Check status |

Status uses text and an optional decorative icon, never color alone. Async status uses `aria-live="polite"`. Technical details are in a disclosure and include network, contract, and final block when available.

## Layout and interaction

Use the supplied palette: page `#F7F7F4`, surface `#FFFFFF`, text `#18211E`, secondary `#46534D`, border `#D8DFDA`, accent `#075444`. Cards are at most 640 px wide, with 24–32 px desktop and 16 px mobile padding. Maintain 4/8/12/16/24/32 px spacing, 44 px minimum targets, visible focus, explicit labels, and wrapping for claims and IDs.

Use standard system sans-serif fonts so the local demo works offline. Press feedback may scale to 0.97 over 120–160 ms with the supplied easing curve. Honor `prefers-reduced-motion`; do not delay keyboard outcomes or animate card height. Clipboard success is announced near the button; a read-only field is the fallback.

## Review

Check the served UI on desktop and 360 px, keyboard, reduced motion, loading, slow RPC, failure, revoke, and malformed links. Record which viewports and interactions were actually inspected.
