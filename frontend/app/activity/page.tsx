"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAct } from "@/components/providers";
import { Empty, ErrorBox, PageHead, Skeleton } from "@/components/ui";
import { readJson } from "@/lib/chain";
import { configured } from "@/lib/config";
import { ago, short, when } from "@/lib/format";
import type { Page, Transition } from "@/lib/types";

const SIZE = 20;

export default function Activity() {
  const { version } = useAct();
  const [items, setItems] = useState<Transition[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = async (offset: number, replace: boolean) => {
    setLoading(true);
    try {
      const page = await readJson<Page<Transition>>("get_transitions", [BigInt(offset), BigInt(SIZE)]);
      setTotal(page.total);
      setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (configured) load(0, true);
    else { setLoading(false); setError("The console has no contract address yet."); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return (
    <>
      <PageHead kicker="activity" title={<>Every step, <span className="em">on the record.</span></>} />
      <div className="wrap grid gap-3">
        {error && <ErrorBox message={error} onRetry={() => load(0, true)} />}
        {loading && items.length === 0 && <Skeleton h={220} />}
        {!loading && !error && items.length === 0 && <Empty title="Nothing has happened yet.">Standings you write will leave a trail here.</Empty>}
        {items.length > 0 && (
          <div className="card grid">
            {items.map((t) => (
              <Link key={t.n} href={`/standings/${t.standing}`} className="grid gap-1 md:grid-cols-[70px_1fr_auto] items-baseline py-3.5 border-t border-line first:border-t-0 no-underline">
                <span className="mono text-[12px] muted">#{t.n}</span>
                <div>
                  <div className="text-[15px]">{t.title} <span className="muted">· {t.standing}</span></div>
                  <div className="text-[13.5px] muted">{t.from ? `${t.from.replaceAll("_", " ").toLowerCase()} to ` : ""}<strong className="text-ink font-medium">{t.to.replaceAll("_", " ").toLowerCase()}</strong>{t.note ? ` · ${t.note}` : ""}</div>
                </div>
                <span className="muted text-[12.5px]" title={when(t.at)}>{short(t.actor)} · {ago(t.at)}</span>
              </Link>
            ))}
          </div>
        )}
        {items.length < total && (
          <div><button className="btn" disabled={loading} onClick={() => load(items.length, false)}>{loading ? "Loading..." : `Load more (${total - items.length} left)`}</button></div>
        )}
      </div>
    </>
  );
}
