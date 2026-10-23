<img src="docs/mark.svg" alt="Standing" width="72">

# Standing

Compliance bonds, decided by evidence.

A buyer freezes what a supplier must be able to show. The supplier posts a bond in native GEN. The buyer and the supplier register evidence (public web pages). GenLayer validators first agree exactly on which pages can be read, then judge every requirement; a round is recorded only if they agree. Too few readable pages is an incomplete round: nothing is paid and the evidence can be repaired. The contract derives the overall result in plain code and splits the bond by shares frozen before any evidence existed.

Network: GenLayer Studio Next, chain 61997. RPC: https://studio-next.genlayer.com/api. Explorer: https://explorer-studio-dev.genlayer.com

## What is in the repo

contracts/standing.py: one Intelligent Contract (runner header v0.3.0, the Studio Next runner).
frontend/: Next.js console with a landing page, standings list, create form, standing detail with every action button, dashboard and activity feed. It reads the chain from the browser and asks your wallet to sign. It holds no key.
tests/: 58 offline tests of the contract logic.
deploy/: scripts to deploy the contract and to walk one standing through every step.
demo/: four small evidence pages to test with.
DEPLOYMENT.md: step by step, including Vercel.
ARCHITECTURE.md, SECURITY.md, END-TO-END.md, REPLY.md: design, threat notes, a demo walkthrough, and the reply to the review.
docs/e2e-record.md: written by `npm run smoke` against the deployed contract (not present until you run it).

## Lifecycle

DRAFT, freeze_standing, AWAITING_BOND, post_bond (supplier), ACTIVE, submit_evidence and replace_evidence (buyer or supplier), EVIDENCE_SUBMITTED, request_verification (anyone), VERDICT_PROPOSED, accept_verification (after the frozen challenge period), ACCEPTED, settle_standing, FINALIZED.
New or replaced evidence withdraws a proposed result. Side exits: cancel_standing (buyer, before evidence), recover_standing (anyone, two hours after the deadline, bond returns to the supplier).

## Results and payouts

VERIFIED: every requirement satisfied, each with a quote from a page. PARTIALLY_VERIFIED: every mandatory one satisfied, an optional one not. NOT_VERIFIED: a page contains a quote that contradicts a mandatory requirement. INCONCLUSIVE: a mandatory requirement cannot be settled from the pages.
A round that could not read enough independent publishers is recorded as INCOMPLETE. It is not a result and moves no money.
The buyer sets, per result, the share of the bond paid to the buyer. The rest returns to the supplier. Defaults: 0, 30, 100, 0 percent.

## Status, stated plainly

Tested: the contract logic, with `python3 -m unittest discover -s tests -t .` (58 tests, no installs needed). The tests run against a small stand-in for the genlayer SDK in tests/shim. They cover validation, roles, refunds, all five results, quote grounding, payouts to the wei, the challenge delay, recovery and views.
Not tested: the contract on real GenVM or on Studio Next, the frontend build, and any wallet flow. They were written without network access. The frontend was syntax-checked only. First run on your machine is the real test; DEPLOYMENT.md lists what to check.
Known assumptions to verify on first deploy: the SDK names `gl.eq_principle.prompt_comparative`, `gl.nondet.web.render`, `gl.message_raw["datetime"]` exist as in the GenLayer examples; the genlayer-js 2.0.0-rc.1 calls `estimateTransactionFees`, `writeContract`, `waitForTransactionReceipt` behave as in the SDK docs.
If the runtime exposes no transaction time, every call that depends on time refuses with a clear message; `npm run smoke` checks the timestamps and records the result.
