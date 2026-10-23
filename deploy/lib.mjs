// Shared by deploy.mjs and smoke.mjs. Reads settings from the environment.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as sdk from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RPC = process.env.GENLAYER_RPC || "https://studio-next.genlayer.com/api";
export const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER || "https://explorer-studio-dev.genlayer.com";

export const chain = { ...studioDevnet, id: 61997, rpcUrls: { ...(studioDevnet.rpcUrls ?? {}), default: { http: [RPC] } } };

export function account() {
  let key = process.env.DEPLOYER_PRIVATE_KEY;
  const keyFile = path.join(root, "deploy", ".key");
  if (!key && fs.existsSync(keyFile)) key = fs.readFileSync(keyFile, "utf8").trim();
  if (!key) {
    if (typeof sdk.generatePrivateKey !== "function") throw new Error("Set DEPLOYER_PRIVATE_KEY (0x plus 64 hex characters) in deploy/.env or your shell.");
    key = sdk.generatePrivateKey();
    fs.writeFileSync(keyFile, key + "\n", { mode: 0o600 });
    console.log("Created a throwaway deployer key at deploy/.key (it is git-ignored).");
  }
  return sdk.createAccount(key);
}

export function client(acct) {
  return sdk.createClient({ chain, endpoint: RPC, account: acct });
}

export async function fees(c, estimator, ...args) {
  const fn = typeof c[estimator] === "function" ? c[estimator].bind(c) : c.estimateTransactionFees.bind(c);
  let est;
  try { est = await fn(...args); } catch { est = await c.estimateTransactionFees(); }
  return { distribution: est.distribution, feeValue: est.feeValue };
}

export const wait = (c, hash) =>
  c.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 300, interval: 2000 });

export function findAddress(value) {
  const text = JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)) ?? "";
  const m = text.match(/"(?:contract_address|contractAddress|recipient|to_address)":"(0x[0-9a-fA-F]{40})"/);
  return m ? m[1] : null;
}
