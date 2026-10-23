# Architecture

Four participants. Most failures come from giving a job to the wrong one.

The contract owns who may act, what is held, the challenge delay, the publisher floor, and the arithmetic from a result to a payment. No model output reaches any of it except as one of three words per requirement (SATISFIED, UNSATISFIED, UNCERTAIN) plus a short quote.

GenLayer consensus owns two questions, asked in order by `request_verification`.
1. Which registered pages can be read. Every validator fetches every page and returns a map of source id to READ or UNREADABLE. `gl.eq_principle.strict_eq` requires the maps to be identical, so different retrieval outcomes cannot pass as agreement.
2. What the readable pages say about each requirement. `gl.eq_principle.prompt_comparative` wraps `_judge`; validators must agree on every requirement status and on every source state. Quotes and wording may differ.

The model answers one question over one page set. Page text is fenced in the prompt, runs of three or more angle brackets are stripped from it so a page cannot forge a fence, and the prompt tells the model to treat the pages as data.

The console renders the record and prepares what the wallet signs. After each write it reads the contract back before saying the action is confirmed.

## Too little evidence is not a result

If the readable pages come from fewer independent publishers than the frozen floor, the round is recorded as INCOMPLETE. The standing stays in EVIDENCE_SUBMITTED, nothing is paid, and the parties can replace the evidence and ask again. If nothing is fixed, `recover_standing` returns the bond to the supplier two hours after the deadline. Retrieval failure can never produce a payment to the buyer.

## Who may change evidence

Only the buyer and the supplier. The supplier may replace any item; the buyer only items it registered. Adding or replacing evidence while a result is proposed withdraws that proposal, so the supplier can answer it. Bounds: 5 items, 6 replacements, 3 rounds that propose a result, 8 attempts in all. Evidence stays open until the deadline plus one hour.

## Grounding

SATISFIED and UNSATISFIED are both kept only if the model supplies a quote of at least 12 characters that is found on a page that was read (compared after stripping markup and case). The answer records which page the quote was found on. Otherwise the answer becomes UNCERTAIN. A silent page therefore cannot disprove a requirement. If no page is readable, the model is not asked.

## Derivation (`_derive_result`)

a mandatory requirement UNSATISFIED (contradicted by a quote): NOT_VERIFIED
a mandatory requirement UNCERTAIN: INCONCLUSIVE
all satisfied: VERIFIED
otherwise: PARTIALLY_VERIFIED

A proven failure outranks an unresolved requirement, because resolving the other one cannot make the standing verified.

## Time

The runtime must supply a transaction time (`gl.message_raw["datetime"]`). The transaction time is read from `gl.message.datetime`, then `gl.message_raw["datetime"]`, then the standard clock, which GenLayer wires to the transaction time. Create, freeze, evidence changes, verification, accept and recover refuse if none is usable, and a bond posted without a time is refunded. Nothing silently skips a window.

Consensus helpers: everything a consensus block uses is defined inside `_make_toolkit()`, because the validator sandbox ships module-level functions by name and cannot find them. A test fails if a module-level function is used inside a consensus block.

## Money

The bond is the transaction's own value, never an argument. A wrong amount, a stranger, or a wrong state returns the value and finishes without raising, because GenLayer credits a payable call's value before it runs and a raise would roll the refund back. Settlement writes state first, then emits transfers: buyer share is bond times shares divided by 10000, the supplier receives the remainder, so no wei is lost.

## Storage

Records are canonical JSON strings in TreeMaps (standings, evidence, verdicts, log), plus counters. Views return JSON strings so the console parses one format.
