"use client";
import Link from "next/link";
import { useMemo } from "react";

import { useAct, useWallet } from "@/components/providers";
import { Empty, ErrorBox, PageHead, ResultChip, Skeleton, StateChip } from "@/components/ui";
import { readJson } from "@/lib/chain";
import { configured } from "@/lib/config";
import { ago, gen, sameAddr, STATE_LABEL, RESULT_LABEL } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import { RESULTS, STATES, type Card, type Page, type Summary } from "@/lib/types";

const TONE: Record<string, string> = {
  VERIFIED: "#2f7d4f", PARTIALLY_VERIFIED: "#a86a12", NOT_VERIFIED: "#b83a2b", INCONCLUSIVE: "#8d8777",
};

export default function Dashboard() {
  const { address } = useWallet();
  const { version } = useAct();
  const summary = useLoad(() => (configured ? readJson<Summary>("get_summary") : Promise.reject(new Error("The console has no contract address yet."))), [version], 30000);
  const list = useLoad(() => (configured ? readJson<Page<Card>>("list_standings", [0n, 50n]) : Promise.resolve({ total: 0, items: [] })), [version], 30000);

  const items = list.data?.items ?? [];
  const mine = useMemo(() => items.filter((c) => sameAddr(c.buyer, address) || sameAddr(c.supplier, address)), [items, address]);
  const attention = useMemo(() => {
    const out: { c: Card; why: string }[] = [];
    for (const c of items) {
      const b = sameAddr(c.buyer, address);
      const s = sameAddr(c.supplier, address);
      if (c.state === "DRAFT" && b) out.push({ c, why: "Freeze the terms" });
      else if (c.state === "AWAITING_BOND" && s) out.push({ c, why: "Post your bond" });
      else if (c.state === "EVIDENCE_SUBMITTED" && (b || s)) out.push({ c, why: "Request verification" });
      else if (c.state === "VERDICT_PROPOSED" && (b || s)) out.push({ c, why: "Accept the result" });
      else if (c.state === "ACCEPTED") out.push({ c, why: "Settle and pay out" });
    }
    return out;
  }, [items, address]);
  const upcoming = useMemo(
    () => items.filter((c) => ["ACTIVE", "EVIDENCE_SUBMITTED", "VERDICT_PROPOSED"].includes(c.state)).sort((a, b) => a.deadline - b.deadline).slice(0, 5),
    [items],
  );

  const sm = summary.data;
  const total = sm ? RESULTS.reduce((n, r) => n + (sm.by_result[r] ?? 0), 0) : 0;
  const maxState = sm ? Math.max(1, ...STATES.map((s) => sm.by_state[s] ?? 0)) : 1;

  return (
    <>
      <PageHead kicker="dashboard" title={<>The whole book, <span className="em">at a glance.</span></>}>
        <Link href="/standings/new" className="btn btn-primary">Write a standing</Link>
      </PageHead>
      <div className="wrap grid gap-6">
        {summary.error && <ErrorBox message={summary.error} onRetry={summary.reload} />}
        {!sm && !summary.error && <div className="grid gap-4 md:grid-cols-4"><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /></div>}

        {sm && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[
              ["standings", String(sm.count)],
              ["bonds in play", gen(sm.bonds_in_play)],
              ["held by the contract", gen(sm.custody)],
              ["recorded steps", String(sm.transitions)],
            ].map(([k, v]) => (
              <div key={k} className="card"><div className="label-mono">{k}</div><div className="h-card mt-3 text-[30px]">{v}</div></div>
            ))}
          </div>
        )}

        {sm && (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section className="card grid gap-3">
              <div className="label-mono">pipeline</div>
              {STATES.map((s) => (
                <div key={s} className="grid grid-cols-[150px_1fr_28px] items-center gap-3 text-[14px]">
                  <span>{STATE_LABEL[s]}</span>
                  <div className="bar"><i style={{ width: `${((sm.by_state[s] ?? 0) / maxState) * 100}%`, background: s === "CANCELLED" ? "#b83a2b" : s === "FINALIZED" ? "#1b1916" : "#e5432b" }} /></div>
                  <span className="mono text-[12px] text-right">{sm.by_state[s] ?? 0}</span>
                </div>
              ))}
            </section>

            <section className="card grid gap-4">
              <div className="label-mono">results so far</div>
              {total === 0 ? <p className="muted text-[14px]">No standing has reached an accepted result yet.</p> : (
                <div className="flex items-center gap-6 flex-wrap">
                  <Donut counts={RESULTS.map((r) => sm.by_result[r] ?? 0)} total={total} />
                  <ul className="grid gap-2 text-[13.5px]">
                    {RESULTS.map((r) => (
                      <li key={r} className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: TONE[r] }} />{RESULT_LABEL[r]} <span className="mono text-[12px] muted">{sm.by_result[r] ?? 0}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card grid gap-3">
            <div className="label-mono">needs your attention</div>
            {!address && <p className="muted text-[14px]">Connect a wallet to see what is waiting on you.</p>}
            {address && attention.length === 0 && <p className="muted text-[14px]">Nothing is waiting on this wallet.</p>}
            {attention.map(({ c, why }) => (
              <Link key={c.id} href={`/standings/${c.id}`} className="flex items-center justify-between gap-3 py-2 border-t border-line first:border-t-0 no-underline">
                <div><div className="text-[15px]">{c.title}</div><div className="muted text-[13px]">{why}</div></div>
                <StateChip state={c.state} />
              </Link>
            ))}
          </section>

          <section className="card grid gap-3">
            <div className="label-mono">next deadlines</div>
            {upcoming.length === 0 && <p className="muted text-[14px]">No open standing has a deadline coming.</p>}
            {upcoming.map((c) => (
              <Link key={c.id} href={`/standings/${c.id}`} className="flex items-center justify-between gap-3 py-2 border-t border-line first:border-t-0 no-underline">
                <div><div className="text-[15px]">{c.title}</div><div className="muted text-[13px]">{gen(c.bond)} bond</div></div>
                <span className="mono text-[12px]">{ago(c.deadline)}</span>
              </Link>
            ))}
          </section>
        </div>

        <section className="card grid gap-3">
          <div className="flex items-baseline justify-between"><div className="label-mono">{address ? "your standings" : "latest standings"}</div><Link href="/standings" className="label-mono">see all</Link></div>
          {(address ? mine : items.slice(0, 6)).length === 0 && <Empty title="Nothing here yet.">{address ? "Standings you write or are named in will show up here." : "No standings have been written yet."}</Empty>}
          {(address ? mine : items.slice(0, 6)).slice(0, 8).map((c) => (
            <Link key={c.id} href={`/standings/${c.id}`} className="grid md:grid-cols-[1fr_auto_auto] items-center gap-3 py-3 border-t border-line first:border-t-0 no-underline">
              <div><div className="text-[15px]">{c.title}</div><div className="muted text-[13px]">{c.id} · {gen(c.bond)} · updated {ago(c.updated_at)}</div></div>
              <StateChip state={c.state} /><ResultChip result={c.result} />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}

function Donut({ counts, total }: { counts: number[]; total: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Results">
      <g transform="rotate(-90 70 70)">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e4ded0" strokeWidth="18" />
        {counts.map((n, i) => {
          if (!n) return null;
          const len = (n / total) * c;
          const el = <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={TONE[RESULTS[i]]} strokeWidth="18" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </g>
      <text x="70" y="76" textAnchor="middle" style={{ fontFamily: "var(--font-serif)", fontSize: 30 }}>{total}</text>
    </svg>
  );
}
