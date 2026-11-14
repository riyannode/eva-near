# Design

## First screen

The homepage explains why a freelancer needs a work reference when a project is confidential. The sample card shows the contribution, agency, and privacy boundary together. **Open EVA** opens a native dialog titled **How will you use EVA?** after activation. Each of the three role choices navigates directly. Show **NEAR wallet** on the Agency choice. Escape closes the dialog and focus returns to the trigger. The interactive demo remains a separate link.

## Screens

- `/freelancer` leads with the request form. A freelancer can copy a draft to send to an existing agency contact.
- `/agency` leads with wallet connection and the approved wording form. Show the selected account before issuing. Enable share actions after a matching final read. Provide a way to check a saved reference and allow revocation by its issuer. A wallet request can be awaiting confirmation, submitted, failed, or uncertain. Check final state before retrying an uncertain action.
- `/recruiter` opens the public verifier. Recruiters can check an issued reference without a wallet or account.
- `/project` gives visitors with an older bookmark links to the role pages.
- `/demo` displays a sample claim and text-labeled `Valid`, `Revoked`, and `Edited` choices. In Sandbox it also links to `/issue` so judges can issue, verify, and revoke a reference using the local contract.
- `/verify` accepts a complete reference link or checks the fragment on open. It displays the claim after integrity checks and a final registry read. `Check again` reads the current status.
- `/issue` is available in local Sandbox. It has two labeled fields, a preview, explicit approval, and one submit action. A final result offers `Copy link`, `Open reference`, and `Revoke`. Pending actions retain the same ID.

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

Use the shared landing shell for navigation, footer, and palette. Warm paper and a subdued green wash form the background. Workspace frames use an off-white surface with a light rule. The product uses the [ReUI Frame pattern](https://reui.io/components/frame) and [shadcn Field composition](https://ui.shadcn.com/docs/components/base/field) in its existing CSS. Use the same wide, left-aligned desktop workspace across roles. Keep prose and fields at a readable width within it. Stack columns on mobile with at least 16 px of padding. Maintain 4/8/12/16/24/32 px spacing, 44 px minimum targets, visible focus, explicit labels, and wrapping for claims and IDs.

Bundle fonts locally. Use the existing Geist and system font stack across the screens. Press feedback may scale to 0.97 over 120–160 ms with the supplied easing curve. Honor `prefers-reduced-motion`; do not delay keyboard outcomes or animate card height. Clipboard success is announced near the button; a read-only field is the fallback.

## Review

Check the served UI on desktop and 360 px, keyboard, reduced motion, loading, slow RPC, failure, revoke, and malformed links. Record which viewports and interactions were actually inspected.
