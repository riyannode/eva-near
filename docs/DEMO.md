# EVA demo

## 60–90 second judge path

Open the landing page and both synthetic Testnet references before recording. The walkthrough requires no wallet connection or new transaction.

| Time | Scene | What to show |
| --- | --- | --- |
| 0:00 to 0:12 | Landing | Open the [live app](https://evalabs.my.id) and pause on the headline and sample contribution. |
| 0:12 to 0:24 | Open EVA | Click **Open EVA** and show the Freelancer, Agency, and Recruiter choices. |
| 0:24 to 0:39 | Agency | Choose **Agency**. Show **Connect NEAR Wallet** and the approved wording form. |
| 0:39 to 0:54 | Active reference | Open the [active Testnet reference](https://evalabs.my.id/verify#r=WyJldmE6cmVmZXJlbmNlOnYyIiwidGVzdG5ldCIsImV2YS1yZWZlcmVuY2Utd2FsbGV0LTI2MTExMy50ZXN0bmV0IiwiZXZhLWlzc3Vlci0yNjExMTMudGVzdG5ldCIsImZhMThkZjQzYWJiMDI0MTlkM2RhYjQ2NmI2NWFmYWNjIiwidW1EalRYa0hhRllDR0hBNjdOUzg1aTZWbkExS0hCcWNqa2dmZ3pYX1JPZyIsIkFsZXggTW9yZ2FuIiwiRGVzaWduZWQgdGhlIGNoZWNrb3V0IGZsb3cgZm9yIGEgc3ludGhldGljIHN0b3JlZnJvbnQuIl0). Show `VALID`, then expand **Verification details** to show the issuer and final block. |
| 0:54 to 1:09 | Revoked reference | Open the [revoked Testnet reference](https://evalabs.my.id/verify#r=WyJldmE6cmVmZXJlbmNlOnYyIiwidGVzdG5ldCIsImV2YS1yZWZlcmVuY2Utd2FsbGV0LTI2MTExMy50ZXN0bmV0IiwiZXZhLWlzc3Vlci0yNjExMTMudGVzdG5ldCIsIjlhMjEwNmFhOTQzYzZjYjVhZjkxNWU4YmM4YjU1NWVlIiwiY1A3SWNtbFR3X3dVeGstNTEzblNCNVpfdkZMYks5d29POFNHbkNWa0hPVSIsIk1heWEgQ2hlbiIsIlJldmlld2VkIGFjY2Vzc2liaWxpdHkgZm9yIGEgc3ludGhldGljIHN0b3JlZnJvbnQuIl0). Show `REVOKED` and its verification details. |
| 1:09 to 1:20 | Closing | Point to the issuing account and Testnet registry in **Verification details**. |

## What to say

1. **Landing.** "EVA gives freelancers a way to show what they contributed on confidential projects without publishing client names or files."
2. **Open EVA.** "Freelancers prepare a request, agencies approve it, and recruiters check the shared reference."
3. **Agency.** "The agency reviews the wording and uses its NEAR wallet to record a commitment to that exact reference."
4. **Active reference.** "I opened this link without a wallet, and EVA checked the issuing account and confirmed that the reference is still active."
5. **Revoked reference.** "This second link was valid when issued, and the same link now shows revoked after the issuer withdrew it."
6. **Closing.** "One NEAR registry lets recruiters check who issued a reference, whether its text matches, and whether it was revoked."

## Evidence checklist

- [x] Public EVA app reachable.
- [x] Real Testnet issue completed with Meteor Wallet.
- [x] Recruiter verification completed without a wallet.
- [x] Real Testnet revoke completed.
- [x] The same reference link changed from `VALID` to `REVOKED`.
- [x] Deployed WASM matches the tested Docker Judge artifact.
- [x] Local NEAR Sandbox issue, verify, and revoke tested.
- [x] Desktop and 360 px smoke checks completed.

[Testnet release evidence](../README.md#near-testnet) · [Local Sandbox walkthrough](../README.md#local-near-sandbox)
