import type { Result, State, VerdictResult } from "./types";

export const WEI = 10n ** 18n;

/** Atto-GEN (a decimal string) as a short GEN amount. */
export function gen(wei: string | bigint | undefined, digits = 6): string {
  if (wei === undefined || wei === "") return "0 GEN";
  let v: bigint;
  try {
    v = BigInt(wei);
  } catch {
    return "0 GEN";
  }
  const whole = v / WEI;
  const frac = (v % WEI).toString().padStart(18, "0").slice(0, digits).replace(/0+$/, "");
  return `${whole.toString()}${frac ? "." + frac : ""} GEN`;
}

/** A decimal GEN string ("0.25") as atto-GEN. Returns null when it is not a positive amount. */
export function toWei(input: string): bigint | null {
  const text = input.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(text)) return null;
  const [w, f = ""] = text.split(".");
  const v = BigInt(w) * WEI + BigInt(f.padEnd(18, "0"));
  return v > 0n ? v : null;
}

export const short = (a?: string) => (a && a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a ?? "");
export const sameAddr = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export function when(ts: number): string {
  if (!ts) return "n/a";
  return new Date(ts * 1000).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function ago(ts: number, now = Math.floor(Date.now() / 1000)): string {
  if (!ts) return "n/a";
  const d = now - ts;
  const abs = Math.abs(d);
  const unit = abs < 90 ? `${abs}s` : abs < 5400 ? `${Math.round(abs / 60)}m` : abs < 129600 ? `${Math.round(abs / 3600)}h` : `${Math.round(abs / 86400)}d`;
  return d >= 0 ? `${unit} ago` : `in ${unit}`;
}

export function span(seconds: number): string {
  if (seconds <= 0) return "none";
  if (seconds < 120) return `${seconds} seconds`;
  if (seconds < 7200) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

export const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;

export const STATE_LABEL: Record<State, string> = {
  DRAFT: "Draft",
  AWAITING_BOND: "Awaiting bond",
  ACTIVE: "Active",
  EVIDENCE_SUBMITTED: "Evidence in",
  VERDICT_PROPOSED: "Verdict proposed",
  ACCEPTED: "Accepted",
  FINALIZED: "Finalized",
  CANCELLED: "Cancelled",
};

export const RESULT_LABEL: Record<Result, string> = {
  VERIFIED: "Verified",
  PARTIALLY_VERIFIED: "Partially verified",
  NOT_VERIFIED: "Not verified",
  INCONCLUSIVE: "Inconclusive",
  NONE: "No result",
};

export const verdictLabel = (r: VerdictResult) => (r === "INCOMPLETE" ? "Not enough readable evidence" : RESULT_LABEL[r]);

export const RESULT_TONE: Record<Result, "ok" | "warn" | "bad" | "mute"> = {
  VERIFIED: "ok",
  PARTIALLY_VERIFIED: "warn",
  NOT_VERIFIED: "bad",
  INCONCLUSIVE: "mute",
  NONE: "mute",
};

/** A readable line for a failure that came back from the wallet, the RPC or the contract. */
export function explain(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const contract = raw.match(/\[(EXPECTED|LLM_ERROR)\][^"\\\n]*/);
  if (contract) return contract[0];
  if (/user rejected|denied|rejected the request|4001/i.test(raw)) return "The wallet request was cancelled.";
  if (/insufficient funds/i.test(raw)) return "The wallet does not hold enough GEN for the value plus fees. Fund it from the Studio Next faucet.";
  if (/FeesDistributionMissing/i.test(raw)) return "The network asked for a fee distribution and none was attached.";
  return raw.length > 280 ? raw.slice(0, 280) + "..." : raw;
}
