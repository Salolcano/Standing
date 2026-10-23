# Reply to the steward

Thank you for the careful review. Each point is addressed below, with the change and where to see it.

## Adversarial or failed evidence could pay the buyer

Fixed in three layers.
1. Only the buyer and the supplier can register evidence. Third parties can no longer add anything.
2. Reading too little evidence is no longer a result. If fewer independent publishers can be read than the frozen floor, the round is recorded as INCOMPLETE, the standing stays open, and no money moves. The PROTOCOL_DEVIATION result and its payout are removed. If nobody repairs the evidence, the bond returns to the supplier through recovery; unreadable pages cannot pay the buyer.
3. A bounded chance to respond. `replace_evidence` lets the supplier swap any item (the buyer only its own), up to 6 replacements. Adding or replacing evidence while a result is proposed withdraws that proposal, so the supplier can answer it. Evidence stays open until the deadline plus one hour; recovery opens two hours after the deadline. Limits: 3 rounds that propose a result, 8 attempts in total.

## Validators must agree on publisher availability

`request_verification` now runs two consensus steps. Step one asks every validator which pages it can read and uses strict equality over the resulting map, so different retrieval outcomes cannot pass as agreement. Step two, the requirement judgment, also compares each source's state, not only the labels. The publisher count that gates a round comes from step one.

## Negative judgments need contradictory evidence

UNSATISFIED is now kept only if the model supplies a quote of at least 12 characters that is found on a page that was read. A page that is merely silent leaves the requirement UNCERTAIN, which can only lead to INCONCLUSIVE and a bond returned to the supplier. Each answer records the source page its quote came from, and the console shows it.

## Timestamps

The first deployment refused every write with "the runtime supplied no transaction time". The contract looked only at `gl.message_raw["datetime"]`. It now reads the transaction time from `gl.message.datetime`, then `gl.message_raw["datetime"]`, then the standard clock that GenLayer wires to the transaction time, and accepts ISO strings, numbers and datetime objects. If none is usable, create, freeze, evidence changes, verification, accept and recover still refuse with a clear message instead of skipping a window, and a bond posted without a time is refunded. `npm run smoke` asserts `created_at` and `frozen_at` are non-zero and records the outcome.

## End-to-end record

`deploy/smoke.mjs` runs the full lifecycle on Studio Next and writes `docs/e2e-record.md`: bond funding, evidence retrieval and the readable-publisher count, each requirement with its quote and source, validator consensus, an early accept that must be refused (challenge period), the accept after it, settlement, finality of the settlement transaction, and the final payout. The record is committed to the repository only after it has been run against the deployed contract; it is not hand written.

## Frontend finality

After every write the console reads the contract back and shows the action as confirmed only if the expected change is recorded. A node-reported execution result other than a normal return is treated as a failure. Settle, cancel and recover are shown as "waiting for finality" and become final only when the transaction reaches FINALIZED, because GEN moves then.

## Tests

58 offline tests, including: unreadable pages never produce a payout by any route, third parties cannot register evidence, supplier replacement, proposal withdrawal, attempt and round caps, negatives without a contradicting quote degrade to uncertain, the recovery window, and refusal of every clock-dependent call without a timestamp.
