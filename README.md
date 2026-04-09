# ChainVote

A lightweight **decentralized voting dApp**: ballot data and vote tallies live on an **Ethereum-compatible smart contract**; voters interact through a static web UI with **MetaMask** (or any injected `window.ethereum` wallet). An **admin dashboard** lets the contract owner manage candidates and open or close voting.

---

## Project description

ChainVote demonstrates how core election mechanics—candidate list, vote counting, and “one vote per address”—can be enforced **on-chain** instead of on a private server. The **deployer** becomes the **owner**, with exclusive rights to add candidates (and remove those with zero votes), and to toggle whether voting is active. Voters connect a wallet, optionally run a simple on-chain **verification** step, then cast **one vote** per address while voting is open.

The front end is plain **HTML, CSS, and JavaScript**, using **Web3.js** to call the contract and **Chart.js** for a live results chart. Deployment details (**address + ABI**) are centralized in **`contract-config.js`** so the voter app and admin app always target the same deployment.

---

## Features

- **Voter app** (`index.html`): connect wallet, verify, vote for a candidate, live ballot and bar chart (polls the chain periodically).
- **Admin app** (`admin.html`): add candidates, remove candidates with **zero** votes only, start/stop voting; shows connection state, owner warning if the wrong wallet is connected, and Open/Closed status.
- **Smart contract** (`Voting.sol`): candidates array, `hasVoted` / `verifiedVoters` mappings, `votingActive`, `onlyOwner` admin functions.
- **Single config file** (`contract-config.js`): update once after each new deployment.

---

## Tech stack

| Component | Technology |
|-----------|------------|
| Contract | Solidity ^0.8 |
| Chain | Any EVM network (local Ganache, testnet, etc.) |
| Wallet | MetaMask (or compatible) |
| Client | Web3.js 1.x, Bootstrap 5, Chart.js |
| Hosting | Static files only (open locally or deploy to GitHub Pages / Netlify / similar) |

---

## Repository layout

```
├── Voting.sol           # Smart contract
├── contract-config.js   # Contract address + ABI (edit after deploy)
├── index.html           # Voter UI
├── app.js
├── admin.html           # Admin UI
├── admin.js
├── style.css
├── README.md
└── artifacts/           # Optional Remix/build outputs (partially gitignored)
```

---

## Setup and deployment

### 1. Prerequisites

- A browser wallet (**MetaMask** recommended).
- **Remix** ([remix.ethereum.org](https://remix.ethereum.org)) or another Solidity toolchain to compile and deploy `Voting.sol`.
- For local testing: **Ganache** or Remix’s built-in VM (JavaScript VM); for demos, a **public testnet** is often easier so MetaMask uses one shared network.

### 2. Deploy the contract

1. Create a new file in Remix, paste `Voting.sol`, and compile (Solidity 0.8.x).
2. Deploy the **Voting** contract. The constructor expects **`string[] candidateNames`**:
   - Use **`[]`** for an empty ballot and add names only from the admin UI, or  
   - Use **`["Alice", "Bob"]`** for initial names.
3. Confirm the transaction in MetaMask. The account you deploy with becomes **`owner`** (the only admin).

### 3. Point the front end at your deployment

1. Copy the **deployed contract address** from Remix.
2. Open **`contract-config.js`** and set:

   ```js
   const contractAddress = "0xYourDeployedAddress";
   ```

3. If you changed the Solidity interface (new functions or different parameters), replace the **`ABI`** array with the **new ABI** from Remix’s compilation artifact. If you only redeployed the **same** source, updating the address is enough.

### 4. Run the app

- **Locally:** open `index.html` in the browser via a local static server (recommended) or double-click the file. Some browsers restrict `file://` with wallets; serving the folder fixes that, for example:
  - VS Code: “Live Server” extension, or  
  - PowerShell: `npx --yes serve .` from the project folder.
- **Production:** upload the project (or only the static assets) to any static host; ensure **`contract-config.js`** uses the address for the network your users will select in MetaMask.

### 5. Admin usage

Connect in **`admin.html`** with the **same wallet that deployed** the contract. Other addresses can open the page but cannot send successful admin transactions.

---

## Security notes (demo scope)

- **`verifyVoter`** is **permissionless** in this sample: anyone can mark an address as verified. Treat this as a **placeholder** for a real system (allowlist, Merkle proof, or off-chain KYC). Say so explicitly in academic or external demos.
- **One wallet ≠ one person**; Sybil resistance is not solved here.
- Never commit **private keys** or **seed phrases**; only the **public** contract address belongs in `contract-config.js`.

---

## License

The contract declares `SPDX-License-Identifier: MIT`. Use or adapt the rest of the repo under the same spirit unless you attach a different license.
