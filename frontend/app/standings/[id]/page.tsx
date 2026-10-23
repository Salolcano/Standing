"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useAct, useWallet } from "@/components/providers";
import { Empty, ErrorBox, ResultChip, Skeleton, StateChip } from "@/components/ui";
import { readJson } from "@/lib/chain";
import { addressLink, configured } from "@/lib/config";
import { ago, gen, pct, RESULT_LABEL, sameAddr, short, span, verdictLabel, when } from "@/lib/format";
import { useLoad, useNow } from "@/lib/hooks";
import { KINDS, RESULTS, type Page, type StandingView, type State, type Transition } from "@/lib/types";

const STEPS = ["Draft", "Frozen", "Bonded", "Evidence", "Verdict", "Settled"];
const AT: Record<State, number> = {
  DRAFT: 0, AWAITING_BOND: 1, ACTIVE: 2, EVIDENCE_SUBMITTED: 3, VERDICT_PROPOSED: 4, ACCEPTED: 5, FINALIZED: 6, CANCELLED: -1,
};
const RECOVERY_WINDOW = 7200;
const GRACE = 3600;

export default function StandingPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useWallet();
  const { act, working, version } = useAct();
  const local = useNow();

  const { data, error, loading, reload } = useLoad<{ view: StandingView; at: number }>(
    async () => ({ view: await readJson<StandingView>("get_standing", [id]), at: Math.floor(Date.now() / 1000) }),
    [id, version, configured],
    20000,
  );
  const log = useLoad(
    () => readJson<Page<Transition>>("get_transitions", [0n, 50n]),
    [id, version],
  );

  if (!configured) return <div className="wrap pt-14"><Empty title="No contract configured.">Set NEXT_PUBLIC_CONTRACT_ADDRESS and redeploy.</Empty></div>;
  if (error && !data) {
    return (
      <div className="wrap pt-14 grid gap-4">
        <ErrorBox message={/no standing/i.test(error) ? `There is no standing ${id}.` : error} onRetry={reload} />
        <Link href="/standings" className="btn w-fit">Back to standings</Link>
      </div>
    );
  }
  if (!data) return <div className="wrap pt-14 grid gap-4"><Skeleton h={90} /><Skeleton h={260} /></div>;

  const { standing: s, evidence, verdict, clock } = data.view;
  const skew = clock > 1_000_000_000 ? clock - data.at : 0;
  const now = local + skew;
  const buyer = sameAddr(address, s.buyer);
  const supplier = sameAddr(address, s.supplier);
  const at = AT[s.state];
  const acceptAt = s.proposed_at + s.policy.challenge_seconds;
  const waiting = s.state === "VERDICT_PROPOSED" && now < acceptAt;
  const recoverable = ["ACTIVE", "EVIDENCE_SUBMITTED", "VERDICT_PROPOSED"].includes(s.state) && now > s.deadline + RECOVERY_WINDOW;
  const evidenceOpen = ["ACTIVE", "EVIDENCE_SUBMITTED", "VERDICT_PROPOSED"].includes(s.state) && now <= s.deadline + GRACE;
  const party = buyer || supplier;
  const rows = (log.data?.items ?? []).filter((t) => t.standing === s.id);

  // After every write the contract is read back; "confirmed" is only shown if the expected change is there.
  const run = (
    label: string, fn: string, expected: (v: StandingView) => boolean, problem: string,
    extra?: { value?: bigint; finality?: boolean },
  ) =>
    act(label, fn, [s.id], {
      value: extra?.value,
      finality: extra?.finality,
      verify: async () => {
        const v = await readJson<StandingView>("get_standing", [s.id]);
        return expected(v) ? null : problem;
      },
    });

  return (
    <>
      <div className="wrap pt-12">
        <Link href="/standings" className="label-mono no-underline">back to standings</Link>
        <div className="flex flex-wrap items-start justify-between gap-4 mt-3">
          <div>
            <div className="flex flex-wrap gap-2 mb-3"><StateChip state={s.state} /><ResultChip result={s.result} />
              {buyer && <span className="chip">you are the buyer</span>}{supplier && <span className="chip">you are the supplier</span>}</div>
            <h1 className="h-section max-w-3xl">{s.title}</h1>
            <p className="lede mt-3">{s.description}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(window.location.href)}>Copy link</button>
        </div>

        {s.state === "CANCELLED" ? (
          <div className="notice mt-8">This standing was cancelled by the buyer{s.paid.supplier !== "0" ? `, and the bond of ${gen(s.paid.supplier)} went back to the supplier` : ""}.</div>
        ) : (
          <div className="stepper mt-8" aria-label="Lifecycle">
            {STEPS.map((l, i) => <div key={l} data-s={at > i ? "done" : at === i ? "now" : "next"}>{l}</div>)}
          </div>
        )}
      </div>

      <div className="wrap grid gap-6 mt-10 lg:grid-cols-[1.45fr_1fr] items-start">
        <div className="grid gap-6">
          {/* requirements and verdict */}
          <section className="card grid gap-4">
            <div className="flex items-baseline justify-between">
              <div className="label-mono">requirements</div>
              {verdict && <span className="label-mono">attempt {verdict.attempt} · {verdict.publishers_read} of {verdict.publishers_needed} publishers readable</span>}
            </div>
            {verdict?.result === "INCOMPLETE" && s.state === "EVIDENCE_SUBMITTED" && (
              <div className="notice">
                <strong>Not enough readable evidence.</strong> Fewer independent publishers could be read than this standing requires, so no result was recorded and no money moves.
                {" "}The buyer or supplier can replace the unreadable pages below and ask for another round. If nothing is fixed, the bond returns to the supplier after the recovery window.
              </div>
            )}
            {s.requirements.map((r) => {
              const a = verdict?.answers.find((x) => x.id === r.id);
              const tone = a?.status === "SATISFIED" ? "chip-ok" : a?.status === "UNSATISFIED" ? "chip-bad" : a ? "chip-warn" : "";
              return (
                <div key={r.id} className="grid gap-2 md:grid-cols-[44px_1fr_auto] items-start py-3 border-t border-line first:border-t-0 first:pt-0">
                  <span className="mono text-[12px] muted pt-1">{r.id}</span>
                  <div>
                    <div>{r.text}</div>
                    <div className="mt-1 flex gap-2 items-center"><span className="label-mono">{r.mandatory ? "mandatory" : "optional"}</span></div>
                    {a?.quote && <blockquote className="mt-2 pl-3 border-l-2 border-spark text-[14px] muted">&ldquo;{a.quote}&rdquo;{a.source ? <span className="label-mono ml-2">from {a.source}</span> : null}</blockquote>}
                    {a?.status === "UNCERTAIN" && <div className="mt-1 text-[12.5px] muted">No page gave a quote that settles this.</div>}
                  </div>
                  <span className={`chip ${tone}`}>{a ? a.status.toLowerCase() : "not read yet"}</span>
                </div>
              );
            })}
            {verdict && verdict.result !== "INCOMPLETE" && (
              <div className="card-flat flex flex-wrap items-center justify-between gap-3">
                <div><div className="label-mono">derived result · {verdict.rules}</div><div className="h-card mt-1">{verdictLabel(verdict.result)}</div></div>
                <span className="muted text-[13px]">Derived by the contract from the agreed answers. No model named it.</span>
              </div>
            )}
          </section>

          {/* evidence */}
          <section className="card grid gap-4">
            <div className="flex items-baseline justify-between"><div className="label-mono">evidence</div><span className="label-mono">{evidence.length} of 5 · replacements {s.replacements} of 6</span></div>
            {evidence.length === 0 && <p className="muted text-[14px]">Nothing registered yet. Evidence is a public web page neither side controls.</p>}
            {evidence.map((e) => {
              const read = verdict?.sources.find((x) => x.id === e.id)?.state;
              return (
                <div key={e.id} className="grid gap-1 py-3 border-t border-line first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono text-[12px] muted">{e.id}</span><span className="chip">{e.kind.toLowerCase()}</span>
                    <span className="chip">{e.publisher}</span>
                    {read && <span className={`chip ${read === "READ" ? "chip-ok" : "chip-bad"}`}>{read === "READ" ? "read" : "unreadable"}</span>}
                  </div>
                  <a href={e.url} target="_blank" rel="noreferrer" className="break-all text-[14px] underline underline-offset-4">{e.url}</a>
                  <div className="muted text-[12.5px]">{e.label ? `${e.label} · ` : ""}registered by {short(e.submitter)} {ago(e.at, now)}{e.previous?.length ? ` · replaced ${e.previous.length}x` : ""}</div>
                  {evidenceOpen && (supplier || (buyer && sameAddr(e.submitter, address))) && s.replacements < 6 && (
                    <ReplaceForm standingId={s.id} item={e} busy={working} />
                  )}
                </div>
              );
            })}
            {evidenceOpen && party && evidence.length < 5 && (
              <EvidenceForm standingId={s.id} busy={working} count={evidence.length} />
            )}
            {evidenceOpen && !party && (
              <p className="muted text-[13px]">Only the buyer and the supplier can add or replace evidence{address ? "." : ". Connect the wallet you used."}</p>
            )}
            {s.state === "VERDICT_PROPOSED" && party && (
              <p className="muted text-[13px]">Adding or replacing evidence now withdraws the proposed result so a new round can decide it. Replacements left: {6 - s.replacements}.</p>
            )}
          </section>

          {/* timeline */}
          <section className="card grid gap-3">
            <div className="label-mono">timeline</div>
            {rows.length === 0 && <p className="muted text-[14px]">No recorded steps yet.</p>}
            {rows.map((t) => (
              <div key={t.n} className="flex flex-wrap items-baseline justify-between gap-2 py-2 border-t border-line first:border-t-0">
                <div><span className="chip">{t.to.replaceAll("_", " ").toLowerCase()}</span> <span className="muted text-[13.5px] ml-1">{t.note}</span></div>
                <span className="muted text-[12.5px]">{short(t.actor)} · {when(t.at)}</span>
              </div>
            ))}
          </section>
        </div>

        <div className="grid gap-6 lg:sticky lg:top-24">
          {/* actions */}
          <section className="card grid gap-3">
            <div className="label-mono">what you can do now</div>
            <Actions
              state={s.state} buyer={buyer} supplier={supplier} connected={!!address} working={working}
              bond={BigInt(s.bond)} hasEvidence={evidence.length > 0} rounds={s.rounds}
              waiting={waiting} countdown={Math.max(0, acceptAt - now)} recoverable={recoverable}
              onFreeze={() => run("Freeze the terms", "freeze_standing", (v) => v.standing.state === "AWAITING_BOND", "The standing is not frozen.")}
              onBond={() => run("Post the bond", "post_bond", (v) => v.standing.state === "ACTIVE" && v.standing.bond_posted, "The bond is not recorded as posted.", { value: BigInt(s.bond) })}
              onVerify={() => run("Request verification", "request_verification", (v) => v.standing.attempts > s.attempts, "No new round was recorded.")}
              onAccept={() => run("Accept the result", "accept_verification", (v) => v.standing.state === "ACCEPTED", "The result was not accepted.")}
              onSettle={() => run("Settle and pay", "settle_standing", (v) => v.standing.state === "FINALIZED" && v.standing.paid.buyer !== undefined, "The standing is not recorded as settled.", { finality: true })}
              onCancel={() => run("Cancel the standing", "cancel_standing", (v) => v.standing.state === "CANCELLED", "The standing is not recorded as cancelled.", { finality: true })}
              onRecover={() => run("Recover the bond", "recover_standing", (v) => v.standing.state === "FINALIZED", "The standing is not recorded as recovered.", { finality: true })}
              bondLabel={gen(s.bond)}
            />
          </section>

          {/* money */}
          <section className="card grid gap-3">
            <div className="label-mono">the bond</div>
            <div className="h-card">{gen(s.bond)}</div>
            <p className="muted text-[13.5px]">{s.bond_posted ? (s.state === "FINALIZED" || s.state === "CANCELLED" ? "Settlement recorded. Transfers execute when the settlement transaction is final; confirm the transfer on the explorer." : "Held by the contract.") : "Not posted yet."}</p>
            <div className="grid gap-2">
              {RESULTS.map((r) => {
                const bps = s.payout_bps[r] ?? 0;
                const hot = s.result === r;
                return (
                  <div key={r} className={`flex items-center justify-between gap-3 text-[13.5px] rounded-xl px-3 py-2 ${hot ? "bg-spark-soft" : "bg-paper-2"}`}>
                    <span>{RESULT_LABEL[r]}</span>
                    <span className="mono text-[12px]">buyer {pct(bps)} · supplier {pct(10000 - bps)}</span>
                  </div>
                );
              })}
            </div>
            {s.state === "FINALIZED" && (
              <dl className="kv" style={{ gridTemplateColumns: "90px 1fr" }}>
                <dt>Buyer share</dt><dd>{gen(s.paid.buyer)}</dd><dt>Supplier share</dt><dd>{gen(s.paid.supplier)}</dd>
              </dl>
            )}
          </section>

          {/* terms */}
          <section className="card grid gap-3">
            <div className="label-mono">frozen terms</div>
            <dl className="kv" style={{ gridTemplateColumns: "100px 1fr" }}>
              <dt>Buyer</dt><dd><a className="mono text-[12px] underline" href={addressLink(s.buyer)} target="_blank" rel="noreferrer">{short(s.buyer)}</a></dd>
              <dt>Supplier</dt><dd><a className="mono text-[12px] underline" href={addressLink(s.supplier)} target="_blank" rel="noreferrer">{short(s.supplier)}</a></dd>
              <dt>Deadline</dt><dd>{when(s.deadline)} ({ago(s.deadline, now)})</dd>
              <dt>Publishers</dt><dd>{s.policy.min_publishers} or more</dd>
              <dt>Challenge</dt><dd>{span(s.policy.challenge_seconds)}</dd>
              <dt>Domains</dt><dd>{s.policy.allowed_domains.length ? s.policy.allowed_domains.join(", ") : "any public https page"}</dd>
              <dt>Fingerprint</dt><dd className="mono text-[11.5px]">{s.fingerprint ? s.fingerprint.slice(0, 32) + "..." : "not frozen yet"}</dd>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}

type ActionsProps = {
  state: State; buyer: boolean; supplier: boolean; connected: boolean; working: boolean; bond: bigint; bondLabel: string;
  hasEvidence: boolean; rounds: number; waiting: boolean; countdown: number; recoverable: boolean;
  onFreeze: () => void; onBond: () => void; onVerify: () => void; onAccept: () => void; onSettle: () => void; onCancel: () => void; onRecover: () => void;
};

function Actions(p: ActionsProps) {
  const items: { key: string; label: string; onClick: () => void; disabled?: boolean; why?: string; tone?: string }[] = [];
  const need = (ok: boolean, who: string) => (ok ? undefined : p.connected ? `Only ${who} can do this.` : "Connect a wallet first.");

  if (p.state === "DRAFT") {
    items.push({ key: "freeze", label: "Freeze the terms", onClick: p.onFreeze, disabled: !p.buyer, why: need(p.buyer, "the buyer"), tone: "btn-primary" });
  }
  if (p.state === "AWAITING_BOND") {
    items.push({ key: "bond", label: `Post the bond (${p.bondLabel})`, onClick: p.onBond, disabled: !p.supplier, why: need(p.supplier, "the supplier"), tone: "btn-primary" });
  }
  if (p.state === "EVIDENCE_SUBMITTED") {
    items.push({ key: "verify", label: "Request verification", onClick: p.onVerify, disabled: !p.hasEvidence || p.rounds >= 3, why: p.rounds >= 3 ? "Three rounds have already proposed a result." : "Validators first agree on which pages can be read, then on each requirement. This can take a minute or two.", tone: "btn-primary" });
  }
  if (p.state === "VERDICT_PROPOSED") {
    items.push({ key: "accept", label: p.waiting ? `Accept (in ${p.countdown}s)` : "Accept the result", onClick: p.onAccept, disabled: p.waiting, why: p.waiting ? "The result stands for the challenge period first. Anybody can accept it afterwards." : undefined, tone: "btn-spark" });
  }
  if (p.state === "ACCEPTED") {
    items.push({ key: "settle", label: "Settle and pay", onClick: p.onSettle, why: "Anybody can send this. The contract splits the bond by the frozen shares.", tone: "btn-spark" });
  }
  if (p.state === "DRAFT" || p.state === "AWAITING_BOND" || p.state === "ACTIVE") {
    items.push({ key: "cancel", label: "Cancel the standing", onClick: p.onCancel, disabled: !p.buyer, why: need(p.buyer, "the buyer") ?? (p.state === "ACTIVE" ? "The posted bond goes back to the supplier." : undefined), tone: "btn-danger" });
  }
  if (p.recoverable) {
    items.push({ key: "recover", label: "Recover the bond", onClick: p.onRecover, why: "The deadline and the two-hour recovery window have passed with no accepted result. The bond returns to the supplier.", tone: "" });
  }

  if (items.length === 0) {
    return <p className="muted text-[14px]">{p.state === "FINALIZED" || p.state === "CANCELLED" ? "This standing is finished. Nothing more can be done." : "Nothing to do right now."}</p>;
  }
  return (
    <div className="grid gap-3">
      {items.map((i) => (
        <div key={i.key} className="grid gap-1">
          <button className={`btn ${i.tone ?? ""}`} disabled={p.working || i.disabled} onClick={i.onClick}>{p.working ? "Working..." : i.label}</button>
          {i.why && <span className="muted text-[12.5px]">{i.why}</span>}
        </div>
      ))}
    </div>
  );
}

function EvidenceForm({ standingId, busy, count }: { standingId: string; busy: boolean; count: number }) {
  const { act } = useAct();
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<string>("CERTIFICATE");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<string>();

  const valid = useMemo(() => /^https:\/\/[^\s/?#:@]+\.[^\s/?#:@]+(\/\S*)?$/i.test(url.trim()), [url]);

  const submit = async () => {
    setMsg(undefined);
    if (!valid) { setMsg("Enter a public https address, for example https://registry.example.org/acme."); return; }
    const ok = await act("Register evidence", "submit_evidence", [standingId, JSON.stringify({ url: url.trim(), kind, label: label.trim() })], {
      verify: async () => {
        const v = await readJson<StandingView>("get_standing", [standingId]);
        return v.evidence.length > count ? null : "The evidence is not recorded.";
      },
    });
    if (ok) { setUrl(""); setLabel(""); }
  };

  return (
    <div className="card-flat grid gap-3">
      <div className="label-mono">register evidence</div>
      <div className="field">
        <label htmlFor="eu">Page address</label>
        <input id="eu" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="field">
          <label htmlFor="ek">Kind</label>
          <select id="ek" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k} value={k}>{k.toLowerCase()}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="el">Label (optional)</label>
          <input id="el" className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
        </div>
      </div>
      {msg && <span className="text-[13px] text-bad">{msg}</span>}
      <button className="btn btn-primary" disabled={busy} onClick={submit}>Register evidence</button>
    </div>
  );
}

function ReplaceForm({ standingId, item, busy }: { standingId: string; item: { id: string; kind: string }; busy: boolean }) {
  const { act } = useAct();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string>();
  const valid = /^https:\/\/[^\s/?#:@]+\.[^\s/?#:@]+(\/\S*)?$/i.test(url.trim());

  if (!open) return <div><button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Replace this page</button></div>;
  const submit = async () => {
    setMsg(undefined);
    if (!valid) { setMsg("Enter a public https address."); return; }
    const target = url.trim();
    const ok = await act(`Replace ${item.id}`, "replace_evidence", [standingId, item.id, JSON.stringify({ url: target, kind: item.kind })], {
      verify: async () => {
        const v = await readJson<StandingView>("get_standing", [standingId]);
        return v.evidence.find((e) => e.id === item.id)?.url === target ? null : "The replacement is not recorded.";
      },
    });
    if (ok) { setOpen(false); setUrl(""); }
  };
  return (
    <div className="grid gap-2 mt-1">
      <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." aria-label={`New address for ${item.id}`} />
      {msg && <span className="text-[13px] text-bad">{msg}</span>}
      <div className="flex gap-2"><button className="btn btn-sm btn-primary" disabled={busy} onClick={submit}>Replace</button><button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>Cancel</button></div>
    </div>
  );
}
