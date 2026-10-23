import Link from "next/link";

import { HeroArt, Spark, Squiggle } from "@/components/art";

const LANES = ["Certificates", "Audit reports", "Registry entries", "Policy pages", "Public statements", "Frozen terms", "Validator consensus", "Native GEN", "Plain-code payouts"];

const STEPS = [
  { n: "01", tag: "write", title: "Write what must be true.", body: "The buyer lists requirements that can each be answered on their own, marks which are mandatory, sets a deadline and names how the bond splits for every possible result." },
  { n: "02", tag: "freeze", title: "Freeze it.", body: "After that nothing in the terms can change for anyone. A fingerprint of the frozen terms is recorded, so the supplier knows exactly what they are agreeing to." },
  { n: "03", tag: "bond", title: "The supplier posts the bond.", body: "Exactly the frozen amount, in native GEN, from the supplier's own wallet. A wrong amount or a stranger's deposit goes straight back." },
  { n: "04", tag: "evidence", title: "The parties register evidence.", body: "Web pages such as a certificate register, an audit filing or a policy page. Only the buyer and the supplier can add or replace them, and the supplier can answer a proposed result with new evidence." },
  { n: "05", tag: "verify", title: "Validators read it.", body: "Validators first agree exactly on which pages could be read, then agree on every requirement. Satisfied and contradicted both need a quote found on a page. Too few readable pages is an incomplete round, never a payout." },
  { n: "06", tag: "settle", title: "The contract pays.", body: "It derives the overall result from the agreed answers in ordinary code, waits out the challenge period, and splits the bond by the shares frozen in step 02." },
];

const RESULTS = [
  { name: "Verified", rule: "Every requirement is satisfied.", share: "Bond back to the supplier", tone: "chip-ok" },
  { name: "Partially verified", rule: "Every mandatory one is satisfied, an optional one is not.", share: "Split, 30% to the buyer by default", tone: "chip-warn" },
  { name: "Not verified", rule: "A page contains a quote that contradicts a mandatory requirement.", share: "Bond to the buyer", tone: "chip-bad" },
  { name: "Inconclusive", rule: "A mandatory requirement cannot be settled from the pages.", share: "Bond back to the supplier", tone: "" },
];

const OWNERS = [
  { who: "The contract", what: "Who may act, what is held, the challenge delay, the publisher floor, and the arithmetic from a result to a payment. No model touches any of it." },
  { who: "GenLayer consensus", what: "Whether each requirement is met: a question several machines answer apart from each other and must answer alike." },
  { who: "The model", what: "One page set, one requirement, one answer, with words it can point at on the page." },
  { who: "The console", what: "Putting the record on a screen and preparing what your wallet signs. It holds no key." },
];

export default function Home() {
  return (
    <>
      <section className="wrap pt-14 md:pt-20 grid gap-10 md:grid-cols-[1.05fr_1fr] items-center">
        <div>
          <span className="chip chip-spark rise"><Spark size={12} /> Compliance bonds on GenLayer Studio Next</span>
          <h1 className="h-display mt-6 rise" style={{ animationDelay: ".08s" }}>
            Show the proof.<br /><span className="em">We hold the bond.</span>
          </h1>
          <Squiggle className="w-56 h-3 mt-3 rise" />
          <p className="lede mt-6 rise" style={{ animationDelay: ".16s" }}>
            A buyer freezes what a supplier must be able to show. The supplier posts a bond. GenLayer validators read the evidence and the contract pays out by the shares written down before any evidence existed. A page that cannot be read never costs the supplier money.
          </p>
          <div className="flex flex-wrap gap-3 mt-8 rise" style={{ animationDelay: ".24s" }}>
            <Link href="/standings/new" className="btn btn-primary">Write a standing</Link>
            <Link href="/standings" className="btn">Browse standings</Link>
            <Link href="/dashboard" className="btn btn-ghost">Open the dashboard</Link>
          </div>
          <div className="flex flex-wrap gap-2 mt-8 rise" style={{ animationDelay: ".32s" }}>
            {["Terms frozen first", "No human judge", "Money moved by plain code", "No keys in the app"].map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
        </div>
        <div className="card-flat p-3 md:p-5"><HeroArt /></div>
      </section>

      <div className="ticker mt-20" aria-hidden="true">
        <div className="ticker-track">
          {[...LANES, ...LANES].map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </div>

      <section id="how" className="wrap pt-24 scroll-mt-20">
        <div className="label-mono mb-3">how a standing works</div>
        <h2 className="h-section max-w-3xl">One lifecycle. <span className="em">Six steps</span>, no judge.</h2>
        <p className="lede mt-4">Each step is a button in this app, and each is a function on the contract. Nothing is simulated.</p>
        <div className="grid gap-5 mt-12 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card">
              <div className="label-mono">{s.n} · {s.tag}</div>
              <div className="h-card mt-3">{s.title}</div>
              <p className="muted mt-3 text-[15px]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap pt-28 grid gap-12 md:grid-cols-[1fr_1.1fr] items-start">
        <div>
          <div className="label-mono mb-3">the boundary</div>
          <h2 className="h-section">One hard question. <span className="em">The rest is bookkeeping.</span></h2>
          <p className="lede mt-5">
            Ask one language model whether a certificate is current and you get an opinion in a costume. The answer binds only because several machines looked, worked separately, and could not write anything until they matched.
          </p>
        </div>
        <div className="grid gap-3">
          {OWNERS.map((o) => (
            <div key={o.who} className="card py-5">
              <div className="flex items-baseline justify-between gap-4">
                <div className="h-card">{o.who}</div>
                <span className="label-mono">owns</span>
              </div>
              <p className="muted mt-2 text-[15px]">{o.what}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap pt-28">
        <div className="label-mono mb-3">four possible results</div>
        <h2 className="h-section max-w-3xl">The result is derived, <span className="em">never named</span> by a model.</h2>
        <div className="grid gap-3 mt-10">
          {RESULTS.map((r) => (
            <div key={r.name} className="card py-5 grid gap-2 md:grid-cols-[220px_1fr_280px] items-center">
              <span className={`chip ${r.tone} w-fit`}>{r.name}</span>
              <span className="text-[15px]">{r.rule}</span>
              <span className="muted text-[14px]">{r.share}</span>
            </div>
          ))}
        </div>
        <p className="muted text-[14px] mt-4">The shares shown are defaults. The buyer sets all four when writing the standing, and they freeze with it.</p>
      </section>

      <section className="wrap pt-28">
        <div className="card-flat p-10 md:p-16 text-center">
          <Spark size={30} />
          <h2 className="h-section mt-4">Put a bond behind a claim.</h2>
          <p className="lede mx-auto mt-4">Connect a wallet on Studio Next, write the requirements, and walk a standing from draft to payout in about ten minutes.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link href="/standings/new" className="btn btn-primary">Write a standing</Link>
            <Link href="/activity" className="btn">See what happened lately</Link>
          </div>
        </div>
      </section>
    </>
  );
}
