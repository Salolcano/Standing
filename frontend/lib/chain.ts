/**
 * The only file that talks to GenLayer.
 *
 * Reads use a throwaway account and sign nothing. Writes are signed by the
 * person's wallet; this app never holds a key. Every write carries a fee
 * preset, because Studio Next refuses a write without one
 * (FeesDistributionMissing).
 *
 * genlayer-js 2.0.0-rc.1 is a prerelease. The client is typed loosely on
 * purpose so a change of candidate surfaces as a runtime message, not a failed
 * build.
 */
import { createClient, createAccount } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

import { config } from "./config";
import type { Eip1193 } from "./wallet";

/* eslint-disable @typescript-eslint/no-explicit-any */
const base = studioDevnet as any;
export const chain: any = {
  ...base,
  id: config.chainId,
  rpcUrls: { ...(base.rpcUrls ?? {}), default: { http: [config.rpc] } },
};

let reader: any;
function readClient(): any {
  if (!reader) reader = (createClient as any)({ chain, endpoint: config.rpc, account: createAccount() });
  return reader;
}

/** Read a view that returns a JSON string, and parse it. */
export async function readJson<T>(functionName: string, args: unknown[] = []): Promise<T> {
  const out = await readClient().readContract({ address: config.contract, functionName, args });
  const text = typeof out === "string" ? out : String(out);
  return JSON.parse(text) as T;
}

export type Stage = "fees" | "sign" | "consensus";

export type WriteOptions = {
  provider: Eip1193;
  account: string;
  functionName: string;
  args: unknown[];
  value?: bigint;
  onStage?: (stage: Stage) => void;
  onHash?: (hash: string) => void;
};

export type WriteOutcome = { hash: string; failure?: string; note?: string };

const BAD_STATUS = /UNDETERMINED|LEADER_TIMEOUT|VALIDATORS_TIMEOUT|CANCELED|CANCELLED/;

function inspect(tx: any): { failure?: string; note?: string } {
  let text = "";
  try {
    text = JSON.stringify(tx, (_k, v) => (typeof v === "bigint" ? v.toString() : v)) ?? "";
  } catch {
    text = String(tx);
  }
  const refunded = text.match(/\[REFUNDED\] [^"\\]*/);
  if (refunded) return { note: refunded[0] };
  const message = text.match(/\[(EXPECTED|LLM_ERROR)\][^"\\]*/);
  if (message) return { failure: message[0] };
  const status = String(tx?.statusName ?? tx?.status_name ?? "");
  if (BAD_STATUS.test(status)) {
    return { failure: `Consensus did not settle on a result (${status}). Nothing was recorded; try the round again.` };
  }
  const exec = String(tx?.txExecutionResultName ?? tx?.tx_execution_result_name ?? "");
  if (/ERROR/.test(exec) || /FINISHED_WITH_ERROR/.test(text)) {
    return { failure: "The contract refused the call. Nothing was changed." };
  }
  // Accepted is not the same as executed. When the node reports an execution
  // result, anything other than a normal return is a failure.
  if (exec && !/FINISHED_WITH_RETURN/.test(exec)) {
    return { failure: `The call was accepted but did not execute successfully (${exec}). Nothing was changed.` };
  }
  return {};
}

/**
 * Wait until a transaction is final. Accepted state can still be reverted
 * during the appeal window, and value only leaves the contract when the
 * transaction finalizes, so a payment is not "paid" until this returns.
 */
export async function awaitFinal(hash: string): Promise<{ final: boolean; failure?: string }> {
  try {
    await readClient().waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      retries: 720,
      interval: 5000,
    });
    const tx = await readClient().getTransaction({ hash });
    const verdict = inspect(tx);
    return verdict.failure ? { final: false, failure: verdict.failure } : { final: true };
  } catch {
    return { final: false };
  }
}

export async function write(o: WriteOptions): Promise<WriteOutcome> {
  const client: any = (createClient as any)({
    chain,
    endpoint: config.rpc,
    account: o.account as `0x${string}`,
    provider: o.provider,
  });

  o.onStage?.("fees");
  const estimate = await client.estimateTransactionFees();
  const fees = { distribution: estimate.distribution, feeValue: estimate.feeValue };

  o.onStage?.("sign");
  const hash: string = await client.writeContract({
    address: config.contract,
    functionName: o.functionName,
    args: o.args,
    value: o.value ?? 0n,
    fees,
  });
  o.onHash?.(hash);

  o.onStage?.("consensus");
  await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 300,
    interval: 2000,
  });

  let verdict: { failure?: string; note?: string } = {};
  try {
    verdict = inspect(await client.getTransaction({ hash }));
  } catch {
    /* the receipt arrived; a failed read of its detail does not undo it */
  }
  return { hash, ...verdict };
}
