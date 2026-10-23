"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { awaitFinal, write, type Stage } from "@/lib/chain";
import { config, configured, txLink } from "@/lib/config";
import { explain } from "@/lib/format";
import {
  accounts, chainIdOf, discoverWallets, forget, remember, remembered, switchChain,
  type Eip1193, type WalletEntry,
} from "@/lib/wallet";

/* ------------------------------------------------------------------ wallet */

type WalletCtx = {
  wallets: WalletEntry[];
  address?: string;
  provider?: Eip1193;
  onChain: boolean;
  busy: boolean;
  error?: string;
  connect: (id?: string) => Promise<boolean>;
  disconnect: () => void;
  switchNetwork: () => Promise<boolean>;
};

const Wallet = createContext<WalletCtx | null>(null);
export const useWallet = () => {
  const ctx = useContext(Wallet);
  if (!ctx) throw new Error("useWallet outside the provider");
  return ctx;
};

/* ---------------------------------------------------------------- activity */

type Run = {
  label: string;
  stage: Stage | "verify" | "finality" | "done" | "failed";
  hash?: string;
  error?: string;
  note?: string;
};

type ActOptions = {
  value?: bigint;
  /** Reads the contract after the transaction and returns null when the expected change is recorded, else a reason. */
  verify?: () => Promise<string | null>;
  /** True for actions that move GEN: they are shown as paid only after the transaction is final. */
  finality?: boolean;
  onDone?: () => void;
};

type ActCtx = {
  run?: Run;
  /** bumps after every confirmed write, so pages can reload what they show */
  version: number;
  act: (label: string, functionName: string, args: unknown[], options?: ActOptions) => Promise<boolean>;
  dismiss: () => void;
  working: boolean;
};

const Act = createContext<ActCtx | null>(null);
export const useAct = () => {
  const ctx = useContext(Act);
  if (!ctx) throw new Error("useAct outside the provider");
  return ctx;
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [address, setAddress] = useState<string>();
  const [provider, setProvider] = useState<Eip1193>();
  const [chainId, setChainId] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [run, setRun] = useState<Run>();
  const [version, setVersion] = useState(0);
  const [working, setWorking] = useState(false);
  const attached = useRef<Eip1193 | undefined>(undefined);

  useEffect(() => discoverWallets(setWallets), []);

  const follow = useCallback((p: Eip1193) => {
    if (attached.current === p || !p.on) return;
    attached.current = p;
    p.on("accountsChanged", (list) => {
      const next = Array.isArray(list) ? (list as string[])[0] : undefined;
      setAddress(next);
      if (!next) setProvider(undefined);
    });
    p.on("chainChanged", (raw) => setChainId(typeof raw === "string" ? Number.parseInt(raw, 16) : Number(raw)));
  }, []);

  const adopt = useCallback(async (w: WalletEntry, ask: boolean): Promise<boolean> => {
    const list = await accounts(w.provider, ask);
    if (!list[0]) return false;
    follow(w.provider);
    setProvider(w.provider);
    setAddress(list[0]);
    setChainId(await chainIdOf(w.provider));
    remember(w.id);
    return true;
  }, [follow]);

  // a wallet the person used before reconnects without a popup
  useEffect(() => {
    const id = remembered();
    const w = wallets.find((x) => x.id === id);
    if (w && !address) adopt(w, false).catch(() => {});
  }, [wallets, address, adopt]);

  const connect = useCallback(async (id?: string) => {
    setError(undefined);
    const w = wallets.find((x) => x.id === id) ?? wallets[0];
    if (!w) {
      setError("No wallet found. Install MetaMask or another browser wallet, then reload.");
      return false;
    }
    setBusy(true);
    try {
      const ok = await adopt(w, true);
      if (ok && (await chainIdOf(w.provider)) !== config.chainId) {
        await switchChain(w.provider, config.chainId, config.rpc, config.explorer);
        setChainId(await chainIdOf(w.provider));
      }
      return ok;
    } catch (err) {
      setError(explain(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, [wallets, adopt]);

  const disconnect = useCallback(() => {
    setAddress(undefined);
    setProvider(undefined);
    forget();
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!provider) return false;
    setError(undefined);
    try {
      await switchChain(provider, config.chainId, config.rpc, config.explorer);
      setChainId(await chainIdOf(provider));
      return true;
    } catch (err) {
      setError(explain(err));
      return false;
    }
  }, [provider]);

  const onChain = chainId === config.chainId;

  const wallet = useMemo<WalletCtx>(
    () => ({ wallets, address, provider, onChain, busy, error, connect, disconnect, switchNetwork }),
    [wallets, address, provider, onChain, busy, error, connect, disconnect, switchNetwork],
  );

  const act = useCallback<ActCtx["act"]>(async (label, functionName, args, options) => {
    if (!configured) {
      setRun({ label, stage: "failed", error: "The console has no contract address yet. See the notice at the top of the page." });
      return false;
    }
    let p = provider;
    let a = address;
    if (!p || !a) {
      const ok = await connect();
      if (!ok) return false;
      const w = wallets.find((x) => x.id === remembered()) ?? wallets[0];
      p = w?.provider;
      a = (await accounts(p as Eip1193, false))[0];
    }
    if (!p || !a) return false;
    if ((await chainIdOf(p)) !== config.chainId) {
      try {
        await switchChain(p, config.chainId, config.rpc, config.explorer);
      } catch (err) {
        setRun({ label, stage: "failed", error: explain(err) });
        return false;
      }
    }

    setWorking(true);
    setRun({ label, stage: "fees" });
    try {
      const out = await write({
        provider: p,
        account: a,
        functionName,
        args,
        value: options?.value,
        onStage: (stage) => setRun((r) => ({ ...(r as Run), label, stage })),
        onHash: (hash) => setRun((r) => ({ ...(r as Run), label, hash })),
      });
      if (out.failure) {
        setRun({ label, stage: "failed", hash: out.hash, error: out.failure });
        setVersion((v) => v + 1);
        return false;
      }
      if (out.note) {
        setRun({ label, stage: "done", hash: out.hash, note: out.note });
        setVersion((v) => v + 1);
        return false;
      }
      // Accepted does not mean it did what was asked. Read the contract and check.
      if (options?.verify) {
        setRun({ label, stage: "verify", hash: out.hash });
        let problem: string | null = null;
        try {
          problem = await options.verify();
        } catch (err) {
          problem = `The recorded state could not be read back: ${explain(err)}`;
        }
        if (problem) {
          setRun({ label, stage: "failed", hash: out.hash, error: `The transaction was accepted but the contract does not show the expected change. ${problem}` });
          setVersion((v) => v + 1);
          return false;
        }
      }
      setVersion((v) => v + 1);
      options?.onDone?.();
      if (options?.finality) {
        setRun({ label, stage: "finality", hash: out.hash });
        awaitFinal(out.hash).then((res) => {
          setRun((r) => {
            if (!r || r.hash !== out.hash) return r;
            if (res.failure) return { ...r, stage: "failed", error: res.failure };
            return res.final
              ? { ...r, stage: "done", note: undefined }
              : { ...r, stage: "finality", error: "Still waiting for finality. The payment has not been confirmed. Check the transaction in the explorer." };
          });
          setVersion((v) => v + 1);
        });
        return true;
      }
      setRun({ label, stage: "done", hash: out.hash });
      return true;
    } catch (err) {
      setRun((r) => ({ label, stage: "failed", hash: r?.hash, error: explain(err) }));
      return false;
    } finally {
      setWorking(false);
    }
  }, [provider, address, wallets, connect]);

  const activity = useMemo<ActCtx>(
    () => ({ run, version, act, dismiss: () => setRun(undefined), working }),
    [run, version, act, working],
  );

  return (
    <Wallet.Provider value={wallet}>
      <Act.Provider value={activity}>
        {children}
        <ActivityPanel />
      </Act.Provider>
    </Wallet.Provider>
  );
}

/* ---------------------------------------------------------- activity panel */

const STEPS: { key: Run["stage"]; label: string }[] = [
  { key: "fees", label: "Estimate fees" },
  { key: "sign", label: "Sign in wallet" },
  { key: "consensus", label: "Validators agree" },
  { key: "verify", label: "Check recorded state" },
  { key: "finality", label: "Wait for finality" },
];

function ActivityPanel() {
  const { run, dismiss } = useAct();
  if (!run) return null;
  const order = ["fees", "sign", "consensus", "verify", "finality", "done"];
  const at = run.stage === "failed" ? -1 : order.indexOf(run.stage);
  return (
    <div className="activity" role="status" aria-live="polite">
      <div className="activity-head">
        <span className="label-mono">{run.stage === "done" ? "final" : run.stage === "failed" ? "stopped" : "working"}</span>
        <button className="activity-x" onClick={dismiss} aria-label="Dismiss">x</button>
      </div>
      <div className="activity-title">{run.label}</div>
      {run.stage !== "failed" && run.stage !== "done" && (
        <ol className="activity-steps">
          {STEPS.filter((s) => s.key !== "finality" || run.stage === "finality").map((s, i) => (
            <li key={s.key} data-on={i === at ? "now" : i < at ? "past" : "next"}>
              <span className="dot" />{s.label}
            </li>
          ))}
        </ol>
      )}
      {run.stage === "consensus" && <p className="activity-note">A round with several validators can take a minute or two. Keep this tab open.</p>}
      {run.stage === "finality" && !run.error && <p className="activity-note">Accepted and checked. GEN moves only when the transaction is final, so this is not shown as paid yet. This can take a while; you can leave this tab open.</p>}
      {run.stage === "done" && !run.note && <p className="activity-note">Final on Studio Next and checked against the contract.</p>}
      {run.note && <p className="activity-note activity-warn">{run.note} The value was sent back to your wallet.</p>}
      {run.error && <p className="activity-note activity-bad">{run.error}</p>}
      {run.hash && (
        <a className="activity-link" href={txLink(run.hash)} target="_blank" rel="noreferrer">View transaction</a>
      )}
    </div>
  );
}
