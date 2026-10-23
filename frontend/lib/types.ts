export type State =
  | "DRAFT"
  | "AWAITING_BOND"
  | "ACTIVE"
  | "EVIDENCE_SUBMITTED"
  | "VERDICT_PROPOSED"
  | "ACCEPTED"
  | "FINALIZED"
  | "CANCELLED";

export type Result = "VERIFIED" | "PARTIALLY_VERIFIED" | "NOT_VERIFIED" | "INCONCLUSIVE" | "NONE";
/** A round that could not read enough evidence is recorded, but it is not a result and moves no money. */
export type VerdictResult = Result | "INCOMPLETE";
export type Answer = "SATISFIED" | "UNSATISFIED" | "UNCERTAIN";

export const STATES: State[] = [
  "DRAFT", "AWAITING_BOND", "ACTIVE", "EVIDENCE_SUBMITTED", "VERDICT_PROPOSED", "ACCEPTED", "FINALIZED", "CANCELLED",
];
export const RESULTS: Exclude<Result, "NONE">[] = [
  "VERIFIED", "PARTIALLY_VERIFIED", "NOT_VERIFIED", "INCONCLUSIVE",
];
export const KINDS = ["CERTIFICATE", "AUDIT", "REGISTRY", "POLICY", "STATEMENT", "OTHER"] as const;

export type Requirement = { id: string; text: string; mandatory: boolean };

export type StandingRecord = {
  id: string;
  title: string;
  description: string;
  buyer: string;
  supplier: string;
  requirements: Requirement[];
  policy: { min_publishers: number; challenge_seconds: number; allowed_domains: string[] };
  payout_bps: Record<string, number>;
  bond: string;
  deadline: number;
  state: State;
  result: Result;
  evidence_ids: string[];
  rounds: number;
  attempts: number;
  replacements: number;
  bond_posted: boolean;
  created_at: number;
  updated_at: number;
  proposed_at: number;
  accepted_at: number;
  frozen_at: number;
  fingerprint: string;
  paid: { buyer: string; supplier: string };
  rules: string;
};

export type EvidenceRow = {
  id: string;
  url: string;
  kind: string;
  label: string;
  publisher: string;
  submitter: string;
  at: number;
  previous: string[];
};

export type Verdict = {
  attempt: number;
  round: number;
  result: VerdictResult;
  rules: string;
  at: number;
  publishers_read: number;
  publishers_needed: number;
  answers: { id: string; status: Answer; quote: string; source: string }[];
  sources: { id: string; state: "READ" | "UNREADABLE" }[];
};

export type StandingView = {
  standing: StandingRecord;
  evidence: EvidenceRow[];
  verdict: Verdict | null;
  clock: number;
};

export type Card = {
  id: string;
  title: string;
  state: State;
  result: Result;
  buyer: string;
  supplier: string;
  bond: string;
  deadline: number;
  requirements: number;
  evidence: number;
  updated_at: number;
  created_at: number;
};

export type Transition = {
  n: number;
  standing: string;
  title: string;
  from: string;
  to: string;
  result: string;
  actor: string;
  at: number;
  note: string;
};

export type Summary = {
  version: string;
  rules: string;
  count: number;
  custody: string;
  bonds_in_play: string;
  transitions: number;
  by_state: Record<string, number>;
  by_result: Record<string, number>;
};

export type Page<T> = { total: number; items: T[] };
