# End to end

Push this repo to GitHub first, so the demo pages have public addresses:
https://raw.githubusercontent.com/YOUR-NAME/YOUR-REPO/main/demo/certificate-register.md
https://raw.githubusercontent.com/YOUR-NAME/YOUR-REPO/main/demo/audit-filing.md
https://raw.githubusercontent.com/YOUR-NAME/YOUR-REPO/main/demo/privacy-policy.md
https://raw.githubusercontent.com/YOUR-NAME/YOUR-REPO/main/demo/stale-register.md

Requirements to enter on the create page:
1. A current ISO 27001 certificate is published. (mandatory)
2. An audit report dated 2026 is filed. (mandatory)
3. The policy states a data retention limit. (optional)

Walk with one wallet (press "Use mine" for the supplier). One wallet is both parties, so it may register evidence:
1. Write the standing. Challenge period: none. Bond: 0.01 GEN. Deadline: +2 h.
2. Freeze the terms.
3. Post the bond.
4. Register certificate-register.md, audit-filing.md and privacy-policy.md.
5. Request verification. Expect VERIFIED.
6. Accept the result, then settle. The bond returns to the supplier.

Variation: register stale-register.md instead of certificate-register.md. A quote on that page contradicts requirement 1, so the result is NOT_VERIFIED and settlement pays the bond to the buyer.

Repair demo: register an address that does not exist, such as https://does-not-exist.example.com/page, and request verification. The round is recorded as incomplete and nothing is paid. Press Replace on the item, enter certificate-register.md, and request verification again.

Scripted version, which writes docs/e2e-record.md for your submission: CONTRACT=0x... npm run smoke -- <url> <url>
It takes about three minutes because it waits out a 90 second challenge period and the finality of the settlement.
