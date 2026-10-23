"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAct, useWallet } from "@/components/providers";
import { PageHead } from "@/components/ui";
import { readJson } from "@/lib/chain";
import { configured } from "@/lib/config";
import { gen, sameAddr, toWei } from "@/lib/format";
import { RESULTS, type Card, type Page } from "@/lib/types";

type Req = { text: string; mandatory: boolean };

const SHARES: Record<string, { label: string; hint: string; value: number }> = {
  VERIFIED: { label: "Verified", hint: "everything shown", value: 0 },
  PARTIALLY_VERIFIED: { label: "Partially verified", hint: "an optional one missing", value: 30 },
  NOT_VERIFIED: { label: "Not verified", hint: "a mandatory one contradicted by a quote", value: 100 },
  INCONCLUSIVE: { label: "Inconclusive", hint: "pages do not settle it", value: 0 },
};

const CHALLENGES = [
  { v: 0, l: "None (instant accept, for demos)" },
  { v: 60, l: "1 minute" },
  { v: 300, l: "5 minutes" },
  { v: 3600, l: "1 hour" },
  { v: 86400, l: "1 day" },
];

function localInput(ts: number): string {
  const d = new Date(ts * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function NewStanding() {
  const router = useRouter();
  const { address } = useWallet();
  const { act, working } = useAct();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [reqs, setReqs] = useState<Req[]>([{ text: "", mandatory: true }, { text: "", mandatory: true }]);
  const [minPublishers, setMinPublishers] = useState(1);
  const [domains, setDomains] = useState("");
  const [challenge, setChallenge] = useState(60);
  const [shares, setShares] = useState<Record<string, number>>(Object.fromEntries(Object.entries(SHARES).map(([k, v]) => [k, v.value])));
  const [bond, setBond] = useState("0.01");
  const [deadline, setDeadline] = useState(() => localInput(Math.floor(Date.now() / 1000) + 2 * 3600));
  const [touched, setTouched] = useState(false);

  const built = useMemo(() => {
    const problems: string[] = [];
    if (!title.trim()) problems.push("Give the standing a title.");
    if (!description.trim()) problems.push("Describe what the supplier must be able to show.");
    if (!/^0x[0-9a-fA-F]{40}$/.test(supplier.trim())) problems.push("The supplier must be a wallet address (0x and 40 characters).");
    const filled = reqs.filter((r) => r.text.trim());
    if (filled.length === 0) problems.push("Write at least one requirement.");
    if (filled.length > 0 && !filled.some((r) => r.mandatory)) problems.push("At least one requirement must be mandatory.");
    const wei = toWei(bond);
    if (!wei) problems.push("The bond must be a positive amount of GEN.");
    else if (wei < 10n ** 12n) problems.push("The smallest bond is 0.000001 GEN.");
    const ts = Math.floor(new Date(deadline).getTime() / 1000);
    if (!Number.isFinite(ts) || ts < Math.floor(Date.now() / 1000) + 11 * 60) problems.push("The deadline must be at least ten minutes from now, so the standing can be frozen.");
    const list = domains.split(/[\s,]+/).map((d) => d.trim().toLowerCase()).filter(Boolean);
    if (list.some((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))) problems.push("Allowed domains must look like example.org.");

    const definition = {
      title: title.trim(),
      description: description.trim(),
      supplier: supplier.trim(),
      requirements: filled.map((r) => ({ text: r.text.trim(), mandatory: r.mandatory })),
      policy: { min_publishers: minPublishers, challenge_seconds: challenge, allowed_domains: list },
      payout_bps: Object.fromEntries(RESULTS.map((k) => [k, Math.round(Math.min(100, Math.max(0, shares[k] ?? 0)) * 100)])),
      bond: (wei ?? 0n).toString(),
      deadline: ts,
    };
    return { problems, definition, wei };
  }, [title, description, supplier, reqs, minPublishers, domains, challenge, shares, bond, deadline]);

  const submit = async () => {
    setTouched(true);
    if (built.problems.length > 0 || !configured) return;
    const ok = await act("Write the standing", "create_standing", [JSON.stringify(built.definition)], {
      verify: async () => {
        const page = await readJson<Page<Card>>("list_standings", [0n, 10n]);
        return page.items.some((c) => sameAddr(c.buyer, address) && c.title === built.definition.title) ? null : "The standing is not in the list yet.";
      },
    });
    if (!ok) return;
    try {
      const page = await readJson<Page<Card>>("list_standings", [0n, 10n]);
      const mine = page.items.find((c) => sameAddr(c.buyer, address) && c.title === built.definition.title);
      router.push(mine ? `/standings/${mine.id}` : "/standings");
    } catch {
      router.push("/standings");
    }
  };

  const setReq = (i: number, patch: Partial<Req>) => setReqs((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const quick = (mins: number) => setDeadline(localInput(Math.floor(Date.now() / 1000) + mins * 60));

  return (
    <>
      <PageHead kicker="write a standing" title={<>Write it down, <span className="em">then freeze it.</span></>} />
      <div className="wrap grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
        <div className="grid gap-6">
          <div className="card grid gap-5">
            <div className="label-mono">01 · the claim</div>
            <div className="field">
              <label htmlFor="t">Title</label>
              <input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Acme Components, ISO 27001 standing" maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="d">What the supplier must be able to show</label>
              <textarea id="d" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Acme supplies sensor modules to us and must keep a current certificate and a filed audit." maxLength={2000} />
            </div>
            <div className="field">
              <label htmlFor="s">Supplier wallet</label>
              <div className="flex gap-2">
                <input id="s" className="input mono" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="0x..." />
                <button type="button" className="btn btn-sm" disabled={!address} onClick={() => address && setSupplier(address)}>Use mine</button>
              </div>
              <span className="hint">Only this wallet can post the bond. Using your own wallet lets you walk every step alone, as a demo.</span>
            </div>
          </div>

          <div className="card grid gap-4">
            <div className="flex items-baseline justify-between"><div className="label-mono">02 · requirements</div><span className="label-mono">{reqs.length} of 8</span></div>
            <p className="muted text-[14px]">Each one should be answerable on its own from a web page. Mandatory ones decide the result.</p>
            {reqs.map((r, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[auto_1fr_auto_auto] items-center">
                <span className="mono text-[12px] muted">R{i + 1}</span>
                <input className="input" value={r.text} onChange={(e) => setReq(i, { text: e.target.value })} placeholder="A current ISO 27001 certificate is published." maxLength={300} aria-label={`Requirement ${i + 1}`} />
                <label className="flex items-center gap-2 text-[13px] whitespace-nowrap">
                  <input type="checkbox" checked={r.mandatory} onChange={(e) => setReq(i, { mandatory: e.target.checked })} /> Mandatory
                </label>
                <button type="button" className="btn btn-ghost btn-sm" disabled={reqs.length <= 1} onClick={() => setReqs((rs) => rs.filter((_, j) => j !== i))} aria-label={`Remove requirement ${i + 1}`}>Remove</button>
              </div>
            ))}
            <div><button type="button" className="btn btn-sm" disabled={reqs.length >= 8} onClick={() => setReqs((rs) => [...rs, { text: "", mandatory: false }])}>Add a requirement</button></div>
          </div>

          <div className="card grid gap-5">
            <div className="label-mono">03 · evidence policy</div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="field">
                <label htmlFor="mp">Independent publishers required</label>
                <select id="mp" className="select" value={minPublishers} onChange={(e) => setMinPublishers(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="hint">Pages from one GitHub account or one domain count once. If fewer are readable, the round is recorded as incomplete and nothing is paid: the parties can fix the evidence and ask again.</span>
              </div>
              <div className="field">
                <label htmlFor="ch">Challenge period before a result is accepted</label>
                <select id="ch" className="select" value={challenge} onChange={(e) => setChallenge(Number(e.target.value))}>
                  {CHALLENGES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="dm">Only accept evidence from these domains (optional)</label>
              <input id="dm" className="input" value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="example.org, audits.example.net" />
              <span className="hint">Leave empty to accept any public https page. Subdomains of a listed domain are accepted.</span>
            </div>
          </div>

          <div className="card grid gap-4">
            <div className="label-mono">04 · who gets the bond</div>
            <p className="muted text-[14px]">For each possible result, the share of the bond paid to you (the buyer). The rest returns to the supplier. These freeze with the standing.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {RESULTS.map((k) => (
                <div key={k} className="field">
                  <label htmlFor={`sh-${k}`}>{SHARES[k].label} <span className="muted font-normal">({SHARES[k].hint})</span></label>
                  <div className="flex items-center gap-2">
                    <input id={`sh-${k}`} type="number" min={0} max={100} step={1} className="input" value={shares[k]} onChange={(e) => setShares((s) => ({ ...s, [k]: Number(e.target.value) }))} />
                    <span className="muted">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card grid gap-5">
            <div className="label-mono">05 · bond and deadline</div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="field">
                <label htmlFor="b">Bond in GEN</label>
                <input id="b" className="input" inputMode="decimal" value={bond} onChange={(e) => setBond(e.target.value)} />
                <span className="hint">Held by the contract until the standing settles.</span>
              </div>
              <div className="field">
                <label htmlFor="dl">Evidence deadline</label>
                <input id="dl" type="datetime-local" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  {[[30, "+30 min"], [120, "+2 h"], [1440, "+1 day"], [10080, "+7 days"]].map(([m, l]) => (
                    <button key={l} type="button" className="btn btn-ghost btn-sm" onClick={() => quick(m as number)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="card-flat grid gap-4 lg:sticky lg:top-24">
          <div className="label-mono">what will be frozen</div>
          <div className="h-card">{title.trim() || "Untitled standing"}</div>
          <dl className="kv" style={{ gridTemplateColumns: "110px 1fr" }}>
            <dt>Bond</dt><dd>{built.wei ? gen(built.wei) : "n/a"}</dd>
            <dt>Requirements</dt><dd>{reqs.filter((r) => r.text.trim()).length} ({reqs.filter((r) => r.text.trim() && r.mandatory).length} mandatory)</dd>
            <dt>Publishers</dt><dd>{minPublishers} or more</dd>
            <dt>Challenge</dt><dd>{CHALLENGES.find((c) => c.v === challenge)?.l}</dd>
            <dt>Deadline</dt><dd>{new Date(deadline).toLocaleString()}</dd>
          </dl>
          {touched && built.problems.length > 0 && (
            <ul className="notice list-disc pl-8 grid gap-1">{built.problems.map((p) => <li key={p}>{p}</li>)}</ul>
          )}
          {!configured && <div className="notice">The console has no contract address yet, so this button is paused. See the notice at the top.</div>}
          <button className="btn btn-primary" disabled={working || !configured} onClick={submit}>{working ? "Working..." : "Write the standing"}</button>
          <p className="muted text-[13px]">This creates a draft. Nothing is held and nothing can act on it until you freeze it on the next page.</p>
        </aside>
      </div>
    </>
  );
}
