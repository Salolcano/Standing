/** The person's own wallet, found the way browsers agreed to do it (EIP-6963), with window.ethereum as the fallback. */

export type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (payload: unknown) => void) => void;
  removeListener?: (event: string, handler: (payload: unknown) => void) => void;
};

export type WalletEntry = { id: string; name: string; icon?: string; provider: Eip1193 };

const REMEMBER = "standing.wallet";

export function discoverWallets(onFound: (wallets: WalletEntry[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const found = new Map<string, WalletEntry>();
  const push = () => onFound([...found.values()]);

  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as
      | { info?: { rdns?: string; name?: string; icon?: string }; provider?: Eip1193 }
      | undefined;
    if (!detail?.info?.rdns || !detail.provider) return;
    found.set(detail.info.rdns, {
      id: detail.info.rdns,
      name: detail.info.name ?? detail.info.rdns,
      icon: detail.info.icon,
      provider: detail.provider,
    });
    push();
  };
  window.addEventListener("eip6963:announceProvider", handler as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  // a wallet that does not announce itself still injects window.ethereum
  const timer = window.setTimeout(() => {
    const injected = (window as unknown as { ethereum?: Eip1193 }).ethereum;
    if (injected && found.size === 0) {
      found.set("injected", { id: "injected", name: "Browser wallet", provider: injected });
      push();
    }
  }, 400);

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("eip6963:announceProvider", handler as EventListener);
  };
}

export const remember = (id: string) => {
  try { window.localStorage.setItem(REMEMBER, id); } catch { /* storage may be refused; the person just picks again */ }
};
export const forget = () => {
  try { window.localStorage.removeItem(REMEMBER); } catch { /* as above */ }
};
export const remembered = (): string | null => {
  try { return window.localStorage.getItem(REMEMBER); } catch { return null; }
};

export async function accounts(provider: Eip1193, ask: boolean): Promise<string[]> {
  const out = (await provider.request({ method: ask ? "eth_requestAccounts" : "eth_accounts" })) as string[] | undefined;
  return Array.isArray(out) ? out : [];
}

export async function chainIdOf(provider: Eip1193): Promise<number> {
  const raw = (await provider.request({ method: "eth_chainId" })) as string | number;
  return typeof raw === "string" ? Number.parseInt(raw, 16) : Number(raw);
}

/** Move the wallet to Studio Next, adding the network the first time. */
export async function switchChain(provider: Eip1193, chainId: number, rpc: string, explorer: string): Promise<void> {
  const hex = `0x${chainId.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code !== 4902 && code !== -32603) throw err;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: hex,
        chainName: "GenLayer Studio Next",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: [rpc],
        blockExplorerUrls: [explorer],
      }],
    });
  }
}
