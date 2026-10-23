import type { Result, State } from "@/lib/types";
import { RESULT_LABEL, RESULT_TONE, STATE_LABEL } from "@/lib/format";

export function StateChip({ state }: { state: State }) {
  const tone =
    state === "FINALIZED" ? "chip-ink"
    : state === "CANCELLED" ? "chip-bad"
    : state === "VERDICT_PROPOSED" || state === "ACCEPTED" ? "chip-spark"
    : state === "ACTIVE" || state === "EVIDENCE_SUBMITTED" ? "chip-ok"
    : "";
  return <span className={`chip ${tone}`}><i />{STATE_LABEL[state] ?? state}</span>;
}

export function ResultChip({ result }: { result: Result }) {
  if (result === "NONE") return null;
  return <span className={`chip chip-${RESULT_TONE[result]}`}>{RESULT_LABEL[result]}</span>;
}

export function Skeleton({ h = 120 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} />;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card-flat text-center py-14">
      <div className="h-card">{title}</div>
      {children && <div className="muted mt-2 max-w-md mx-auto text-[15px]">{children}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice">
      <strong>Could not read the contract.</strong> <span className="muted">{message}</span>
      {onRetry && <button className="btn btn-sm ml-3" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function PageHead({ kicker, title, children }: { kicker: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="wrap pt-14 pb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        <div className="label-mono mb-3">{kicker}</div>
        <h1 className="h-section">{title}</h1>
      </div>
      {children}
    </div>
  );
}
