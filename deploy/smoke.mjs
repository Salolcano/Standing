// Walks one standing through the whole lifecycle on Studio Next and writes docs/e2e-record.md.
//
// Usage:
//   CONTRACT=0x... node deploy/smoke.mjs <evidence-url> [<evidence-url> ...]
// Optional: SUPPLIER_PRIVATE_KEY=0x... makes the supplier a second wallet (it needs GEN for fees and the bond).
//
// It checks, and records, the things a reviewer needs to see:
//   the runtime supplies timestamps, the challenge period is enforced (an early accept is refused),
//   evidence is retrieved, validators agree, the bond is paid by the frozen shares, and the transaction is final.
import fs from "node:fs";
import path from "node:path";
import * as sdk from "genlayer-js";
import { account, client, fees, wait, root, EXPLORER, RPC, chain } from "./lib.mjs";
import { TransactionStatus } from "genlayer-js/types";

const address = process.env.CONTRACT;
const urls = process.argv.slice(2);
if (!address || urls.length === 0) {
  console.error("Usage: CONTRACT=0x... node deploy/smoke.mjs https://page-one [https://page-two]");
  process.exit(1);
}

const buyer = account();
const supplier = process.env.SUPPLIER_PRIVATE_KEY ? sdk.createAccount(process.env.SUPPLIER_PRIVATE_KEY) : buyer;
const cb = client(buyer);
const cs = supplier === buyer ? cb : client(supplier);

const lines = [];
const log = (text) => { console.log(text); lines.push(text); };
const tx = (hash) => `${EXPLORER}/tx/${hash}`;
const read = async (fn, args = []) => JSON.parse(await cb.readContract({ address, functionName: fn, args }));
const view = (id) => read("get_standing", [id]);

async function balance(who) {
  try {
    if (typeof cb.getBalance === "function") return BigInt(await cb.getBalance({ address: who.address }));
  } catch { /* not available on this client */ }
  return null;
}

async function send(c, label, functionName, args, value = 0n) {
  const f = await fees(c, "estimateTransactionFees");
  const hash = await c.writeContract({ address, functionName, args, value, fees: f });
  const receipt = await wait(c, hash);
  const detail = JSON.stringify(await c.getTransaction({ hash }), (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  const failed = /FINISHED_WITH_ERROR|\[EXPECTED\]|\[LLM_ERROR\]/.test(detail);
  log(`- ${label}: ${failed ? "REFUSED" : "executed"}  ${tx(hash)}`);
  return { hash, failed, receipt };
}

const bond = 10n ** 13n;
const challenge = 90;
log(`# Standing end-to-end record`);
log(`Network: Studio Next, RPC ${RPC}, chain ${chain.id}`);
log(`Contract: ${address}`);
log(`Run at: ${new Date().toISOString()}`);
log(`Buyer: ${buyer.address}\nSupplier: ${supplier.address}${supplier === buyer ? " (same wallet)" : ""}\n`);

const before = { buyer: await balance(buyer), supplier: await balance(supplier) };

await send(cb, "create standing", "create_standing", [JSON.stringify({
  title: "End-to-end record",
  description: "One standing walked through every step.",
  supplier: supplier.address,
  requirements: [
    { text: "A page states that a certificate is current.", mandatory: true },
    { text: "A page mentions an audit.", mandatory: false },
  ],
  policy: { min_publishers: 1, challenge_seconds: challenge, allowed_domains: [] },
  bond: bond.toString(),
  deadline: Math.floor(Date.now() / 1000) + 3 * 3600,
})]);
const { total } = await read("list_standings", [0n, 1n]);
const id = `S${total}`;
log(`Standing: ${id}\n`);

await send(cb, "freeze", "freeze_standing", [id]);
let st = (await view(id)).standing;
log(`  runtime timestamps: created_at=${st.created_at}, frozen_at=${st.frozen_at} (${st.created_at > 0 && st.frozen_at > 0 ? "supplied" : "MISSING"})`);
if (!(st.created_at > 0)) { log("The runtime supplied no timestamps. Stopping."); fs.writeFileSync(path.join(root, "docs", "e2e-record.md"), lines.join("\n") + "\n"); process.exit(2); }

await send(cs, "post bond", "post_bond", [id], bond);
st = (await view(id)).standing;
log(`  state: ${st.state}, bond_posted=${st.bond_posted}, custody=${(await read("get_summary")).custody}`);

for (const url of urls) await send(cb, `register evidence ${url}`, "submit_evidence", [id, JSON.stringify({ url, kind: "CERTIFICATE", label: "e2e" })]);
await send(cb, "request verification", "request_verification", [id]);
let v = await view(id);
log(`  state: ${v.standing.state}, result: ${v.standing.result}, publishers readable: ${v.verdict?.publishers_read}/${v.verdict?.publishers_needed}`);
for (const a of v.verdict?.answers ?? []) log(`  ${a.id} ${a.status} from ${a.source || "no page"}: "${a.quote}"`);
for (const x of v.verdict?.sources ?? []) log(`  source ${x.id}: ${x.state}`);

await send(cb, `accept before the ${challenge}s challenge period ends (must be refused)`, "accept_verification", [id]);
st = (await view(id)).standing;
log(`  state after the early accept: ${st.state} (${st.state === "VERDICT_PROPOSED" ? "challenge period enforced" : "NOT ENFORCED"})`);
log(`  waiting ${challenge + 15}s ...`);
await new Promise((r) => setTimeout(r, (challenge + 15) * 1000));
await send(cb, "accept after the challenge period", "accept_verification", [id]);
const settle = await send(cb, "settle", "settle_standing", [id]);

log(`  waiting for the settlement transaction to finalize ...`);
await cb.waitForTransactionReceipt({ hash: settle.hash, status: TransactionStatus.FINALIZED, retries: 720, interval: 5000 });
const final = (await view(id)).standing;
log(`  final state: ${final.state}, result: ${final.result}, paid: buyer ${final.paid.buyer}, supplier ${final.paid.supplier}`);
log(`  custody after settlement: ${(await read("get_summary")).custody}`);
const after = { buyer: await balance(buyer), supplier: await balance(supplier) };
if (before.buyer !== null && after.buyer !== null) {
  log(`  balances (GEN fees included): buyer ${before.buyer} to ${after.buyer}, supplier ${before.supplier} to ${after.supplier}`);
} else {
  log("  balances: not available from this client; check the transfer on the explorer address pages.");
}
fs.writeFileSync(path.join(root, "docs", "e2e-record.md"), lines.join("\n") + "\n");
console.log("\nWrote docs/e2e-record.md. Commit it and link it in the submission.");
