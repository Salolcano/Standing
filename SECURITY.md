# Security notes

Who can do what: only the buyer freezes or cancels; only the named supplier posts the bond; only the buyer and the supplier add or replace evidence; anyone requests rounds, accepts a result after the delay, settles, or recovers.

Nobody acts in another's name: every account the contract records is the transaction sender, never an argument.

Payouts: state is written before any transfer is emitted. The payout split cannot exceed the bond. Cancel and recover both return the bond to the supplier only.

Evidence: only the two parties register it. https only, no credentials, no ports, no IP addresses or private hosts. An optional domain allow-list is frozen with the terms. Duplicate addresses are refused. Two pages from one account or domain count as one publisher.

Prompt injection: page text is untrusted data, fenced, capped at 6000 characters per page, and never moves value. Both SATISFIED and UNSATISFIED need a quote found on a page that was read.

Retrieval failure: an unreadable page produces an INCOMPLETE round, never a result. The bond can reach the buyer only through NOT_VERIFIED (a contradicting quote), PARTIALLY_VERIFIED by the frozen share, or a share the buyer froze for INCONCLUSIVE (default 0).

Known limits: a validator set that is wrong in the same way is not detected by the contract. The challenge period is a delay, not an appeal. Using one wallet for both roles is allowed so a demo can run alone; it defeats the purpose in production.

The console holds no private key. The deploy scripts create a throwaway key in deploy/.key, which is git-ignored; use it only on a test network.
