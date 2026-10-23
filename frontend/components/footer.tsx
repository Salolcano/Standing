import Link from "next/link";

import { addressLink, config, configured } from "@/lib/config";
import { Mark } from "./art";

export function Footer() {
  return (
    <footer className="mt-28 border-t border-line">
      <div className="wrap py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5"><Mark /><span className="serif text-[26px] leading-none">Standing</span></div>
          <p className="muted mt-4 max-w-xs text-[14px]">
            Compliance bonds decided by evidence. Terms frozen first, pages read by GenLayer validators, money moved by plain code.
          </p>
        </div>
        <div className="grid gap-2 content-start text-[14px]">
          <span className="label-mono">product</span>
          <Link href="/standings">Standings</Link>
          <Link href="/standings/new">Write a standing</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/activity">Activity</Link>
        </div>
        <div className="grid gap-2 content-start text-[14px]">
          <span className="label-mono">network</span>
          <span>Studio Next</span>
          <span className="mono text-[12px]">chain {config.chainId}</span>
          <a href={config.explorer} target="_blank" rel="noreferrer">Explorer</a>
        </div>
        <div className="grid gap-2 content-start text-[14px]">
          <span className="label-mono">contract</span>
          {configured ? (
            <a className="mono text-[12px] break-all" href={addressLink(config.contract)} target="_blank" rel="noreferrer">{config.contract}</a>
          ) : (
            <span className="muted">not set</span>
          )}
        </div>
      </div>
      <div className="wrap pb-10 label-mono">Settled on GenLayer Studio Next. The console holds no keys.</div>
    </footer>
  );
}
