"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { short } from "@/lib/format";
import { Mark } from "./art";
import { useWallet } from "./providers";

const LINKS = [
  { href: "/standings", label: "Standings" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/activity", label: "Activity" },
  { href: "/#how", label: "How it works" },
];

export function Nav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [path]);

  return (
    <header className="nav" data-scrolled={scrolled}>
      <div className="wrap flex items-center justify-between h-16 gap-4">
        <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="Standing home">
          <Mark />
          <span className="serif text-[26px] leading-none">Standing</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="link" data-on={path === l.href}>{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <WalletButton />
          <button className="md:hidden btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
            Menu
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden wrap pb-4 grid gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="link block py-2">{l.label}</Link>
          ))}
        </div>
      )}
    </header>
  );
}

export function WalletButton() {
  const { address, wallets, onChain, busy, error, connect, disconnect, switchNetwork } = useWallet();
  const [menu, setMenu] = useState(false);

  if (!address) {
    return (
      <div className="relative">
        <button
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => (wallets.length > 1 ? setMenu((m) => !m) : connect())}
        >
          {busy ? "Connecting..." : "Connect wallet"}
        </button>
        {menu && wallets.length > 1 && (
          <div className="card absolute right-0 mt-2 w-60 p-2 grid gap-1 z-50">
            {wallets.map((w) => (
              <button key={w.id} className="btn btn-ghost btn-sm justify-start" onClick={() => { setMenu(false); connect(w.id); }}>
                {w.name}
              </button>
            ))}
          </div>
        )}
        {error && <p className="absolute right-0 mt-2 w-72 text-[12.5px] text-bad bg-paper border border-line rounded-2xl p-3 z-50">{error}</p>}
      </div>
    );
  }
  if (!onChain) {
    return (
      <button className="btn btn-spark btn-sm" onClick={() => switchNetwork()}>
        Switch to Studio Next
      </button>
    );
  }
  return (
    <div className="relative">
      <button className="btn btn-ghost btn-sm" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
        <span className="w-2 h-2 rounded-full bg-ok inline-block" />
        <span className="mono text-[12px]">{short(address)}</span>
      </button>
      {menu && (
        <div className="card absolute right-0 mt-2 w-56 p-2 grid gap-1 z-50">
          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(address); setMenu(false); }}>Copy address</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { disconnect(); setMenu(false); }}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
