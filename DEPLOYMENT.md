# Deployment

You need: Node.js 20 or newer, a GitHub account, a Vercel account, and the MetaMask browser extension.

## 1. Put the contract on Studio Next

In the repo folder:

1. `npm install`
2. `npm run deploy`

The script creates a throwaway wallet in deploy/.key if you have none, deploys contracts/standing.py, waits for validators to accept it, and prints a line starting `NEXT_PUBLIC_CONTRACT_ADDRESS=`. Copy that address. It also writes docs/deployment.json.

If it says the wallet has insufficient funds: import the key in deploy/.key into MetaMask, add Studio Next (chain 61997, RPC https://studio-next.genlayer.com/api, symbol GEN), fund it from the faucet named on the hackathon page, and run again. To use your own funded wallet instead, set DEPLOYER_PRIVATE_KEY in your shell.

If the RPC does not answer, try `GENLAYER_RPC=https://studio-dev.genlayer.com/api npm run deploy`.

If the script cannot find the address in the receipt, it prints the explorer link of the deploy transaction; the contract address is on that page.

Alternative with the GenLayer CLI (version 0.40 or newer): `genlayer network set studio-dev`, then `genlayer deploy --contract contracts/standing.py` with the fee options the CLI asks for.

## 2. Run the console on your computer

1. `cd frontend`
2. `cp .env.example .env`, then open .env and paste your contract address.
3. `npm install`
4. `npm run dev`, then open http://localhost:3270

Connect MetaMask. The page offers to switch to Studio Next and adds it if missing.

## 3. Push to GitHub

1. Create an empty repository on github.com.
2. In the repo folder run: `git init`, `git add .`, `git commit -m "Standing"`, `git branch -M main`, `git remote add origin <your repo url>`, `git push -u origin main`.

## 4. Deploy on Vercel

1. Log in to vercel.com and press Add New, then Project.
2. Import your GitHub repository.
3. Set Root Directory to `frontend`. Framework Preset shows Next.js.
4. Open Environment Variables and add:
   NEXT_PUBLIC_CONTRACT_ADDRESS = your contract address
   NEXT_PUBLIC_GENLAYER_RPC = https://studio-next.genlayer.com/api
   NEXT_PUBLIC_CHAIN_ID = 61997
   NEXT_PUBLIC_EXPLORER = https://explorer-studio-dev.genlayer.com
5. Press Deploy. When it finishes, open the URL.

Changed a variable later? Settings, Environment Variables, edit, then Deployments, the three dots on the latest one, Redeploy. NEXT_PUBLIC values are baked in at build time.

## 5. Make the end-to-end record

The reviewers asked for a real execution record. After step 1, and after you have pushed the repo so the demo pages are public, run in the repo folder:

`CONTRACT=0xYourAddress npm run smoke -- https://raw.githubusercontent.com/YOU/REPO/main/demo/certificate-register.md https://raw.githubusercontent.com/YOU/REPO/main/demo/audit-filing.md`

It writes docs/e2e-record.md. Commit that file and link it in your submission. If it prints MISSING for the timestamps, tell me; the runtime is not supplying a time and I will change how the contract reads it.

## 6. First-run checks

1. The yellow setup notice at the top is gone.
2. The dashboard loads with zero standings.
3. Run the walkthrough in END-TO-END.md.
4. If a write fails at "Estimate fees" or "Sign in wallet", the message in the bottom-right panel names the cause. Send it to me with the transaction link and I will fix the one call.
