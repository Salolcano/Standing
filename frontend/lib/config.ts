/** What the console needs to know, checked once, with no hidden fallback to somebody else's contract. */

export type AppConfig = {
  contract: `0x${string}`;
  rpc: string;
  chainId: number;
  explorer: string;
};

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ZERO = "0x0000000000000000000000000000000000000000";

const contract = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "").trim();
const rpc = (process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://studio-next.genlayer.com/api").trim();
const chainId = Number((process.env.NEXT_PUBLIC_CHAIN_ID ?? "61997").trim());
const explorer = (process.env.NEXT_PUBLIC_EXPLORER ?? "https://explorer-studio-dev.genlayer.com")
  .trim()
  .replace(/\/$/, "");

export const configProblems: { name: string; found: string; wanted: string }[] = [];
if (!ADDRESS.test(contract) || contract.toLowerCase() === ZERO) {
  configProblems.push({
    name: "NEXT_PUBLIC_CONTRACT_ADDRESS",
    found: contract || "(not set)",
    wanted: "the deployed Standing address: 0x followed by 40 hex characters",
  });
}
if (!Number.isInteger(chainId) || chainId !== 61997) {
  configProblems.push({ name: "NEXT_PUBLIC_CHAIN_ID", found: String(chainId), wanted: "61997 (Studio Next)" });
}

export const config: AppConfig = { contract: contract as `0x${string}`, rpc, chainId, explorer };
export const configured = configProblems.length === 0;

export const txLink = (hash?: string) => (hash ? `${config.explorer}/tx/${hash}` : "");
export const addressLink = (address?: string) => (address ? `${config.explorer}/address/${address}` : "");
