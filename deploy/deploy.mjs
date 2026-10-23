// Deploys contracts/standing.py to Studio Next and writes docs/deployment.json.
import fs from "node:fs";
import path from "node:path";
import { account, client, fees, wait, findAddress, root, RPC, EXPLORER } from "./lib.mjs";

const code = fs.readFileSync(path.join(root, "contracts", "standing.py"), "utf8");
const acct = account();
const c = client(acct);
console.log("Deployer:", acct.address);
console.log("RPC:     ", RPC);

const f = await fees(c, "estimateTransactionFeesForDeploy", { code, args: [] });
const hash = await c.deployContract({ code, args: [], leaderOnly: false, fees: f });
console.log("Deploy transaction:", hash);
console.log("Waiting for validators to accept it (this can take a minute)...");
const receipt = await wait(c, hash);

let address = findAddress(receipt);
if (!address) address = findAddress(await c.getTransaction({ hash }));
if (!address) {
  console.log("Deployed, but the address was not found in the receipt.");
  console.log("Open the transaction in the explorer and copy the contract address:", `${EXPLORER}/tx/${hash}`);
  process.exit(0);
}
fs.writeFileSync(
  path.join(root, "docs", "deployment.json"),
  JSON.stringify({ network: "Studio Next", chainId: 61997, rpc: RPC, address, deployTx: hash, deployer: acct.address, at: new Date().toISOString() }, null, 2) + "\n",
);
console.log("\nContract address:", address);
console.log("Explorer:", `${EXPLORER}/address/${address}`);
console.log("\nPut this in frontend/.env and in Vercel:\nNEXT_PUBLIC_CONTRACT_ADDRESS=" + address);
