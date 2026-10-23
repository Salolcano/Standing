"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAct, useWallet } from "@/components/providers";
import { Empty, ErrorBox, PageHead, ResultChip, Skeleton, StateChip } from "@/components/ui";
import { readJson } from "@/lib/chain";
import { configured } from "@/lib/config";
import { ago, gen, sameAddr, short } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import { STATES, type Card, type Page, type State } from "@/lib/types";

export default function Standings() {
  const { address } = useWallet();
  const { version } = useAct();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State | "ALL">("ALL");
  const [role, setRole] = useState<"all" | "buyer" | "supplier">("all");

  const { data, error, loading, reload } = useLoad(
    () => (configured ? readJson<Page<Card>>("list_standings", [0n, 50n]) : Promise.resolve({ total: 0, items: [] })),
    [version],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.items ?? []).filter((c) => {
      if (state !== "ALL" && c.state !== state) return false;
      if (role === "buyer" && !sameAddr(c.buyer, address)) return false;
      if (role === "supplier" && !sameAddr(c.supplier, address)) return false;
      return !q || c.title.toLowerCase().includes(q) || c.id.toLowerCase() === q || c.supplier.toLowerCase().includes(q);
    });
  }, [data, query, state, role, address]);

  return (
    <>
      <PageHead kicker="standings" title={<>Every bond, <span className="em">in one place.</span></>}>
        <Link href="/standings/new" className="btn btn-primary">Write a standing</Link>
      </PageHead>

      <div className="wrap grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input className="input max-w-xs" placeholder="Search title, id or supplier" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
          <select className="select max-w-[220px]" value={state} onChange={(e) => setState(e.target.value as State | "ALL")} aria-label="State">
            <option value="ALL">Every state</option>
            {STATES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ").toLowerCase()}</option>)}
          </select>
          <div className="flex gap-1">
            {(["all", "buyer", "supplier"] as const).map((r) => (
              <button key={r} className={`btn btn-sm ${role === r ? "btn-primary" : "btn-ghost"}`} disabled={r !== "all" && !address} onClick={() => setRole(r)}>
                {r === "all" ? "All" : r === "buyer" ? "I am buyer" : "I am supplier"}
              </button>
            ))}
          </div>
          <span className="label-mono ml-auto">{data ? `${shown.length} of ${data.total}` : ""}</span>
        </div>

        {error && <ErrorBox message={error} onRetry={reload} />}
        {loading && !data && <div className="grid gap-4 md:grid-cols-2"><Skeleton h={170} /><Skeleton h={170} /></div>}
        {data && shown.length === 0 && (
          <Empty title={data.total === 0 ? "No standings yet." : "Nothing matches."}>
            {data.total === 0 ? "Write the first one and walk it through the lifecycle." : "Clear the filters to see everything."}
          </Empty>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((c) => (
            <Link key={c.id} href={`/standings/${c.id}`} className="card card-link">
              <div className="flex items-start justify-between gap-3">
                <span className="label-mono">{c.id.toLowerCase()}</span>
                <div className="flex gap-2 flex-wrap justify-end"><StateChip state={c.state} /><ResultChip result={c.result} /></div>
              </div>
              <div className="h-card mt-3">{c.title}</div>
              <dl className="kv mt-4">
                <dt>Bond</dt><dd>{gen(c.bond)}</dd>
                <dt>Supplier</dt><dd className="mono text-[12.5px]">{short(c.supplier)}{sameAddr(c.supplier, address) ? " (you)" : ""}</dd>
                <dt>Requirements</dt><dd>{c.requirements} · evidence {c.evidence}</dd>
                <dt>Deadline</dt><dd>{ago(c.deadline)}</dd>
              </dl>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
