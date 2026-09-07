# Cloakra

**Shielded capital allocation on Starknet mainnet, through the STRK20 privacy pool.**

Pay the team. Publish no salary table.

<img width="2990" height="1710" alt="image" src="https://github.com/user-attachments/assets/42c8fb4c-f72a-4f4e-914d-2ee089a32760" />


**Live app:** https://cloakra-app.vercel.app · **Demo video (2:21):** https://youtu.be/ZOYmaHv-x8M · **Docs:** https://cloakra-app.vercel.app/docs · **Verify a receipt:** https://cloakra-app.vercel.app/verify

Built for the **STRK20 Private Sprint** (Aug 14 – Sep 7, 2026).

---

## Why

On a transparent chain, every organizational payout is also a disclosure. Paying a security researcher links their wallet - often their identity - to the vulnerability they reported. Splitting a grant among contributors publishes the salary table to every teammate and every observer. Funding a round broadcasts the whole allocation strategy.

Cloakra settles those flows inside the [STRK20 privacy pool](https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a): **who receives and how much stays private, while the pool's public legs stay honestly, verifiably public.**

## What's private, what isn't

| Private (inside the pool) | Public (visible onchain) |
| :--- | :--- |
| Who receives a split, bounty, or grant | The org's deposits into the pool (address + amount) |
| Per-recipient amounts | Any withdrawal to a public wallet (address + amount) |
| The link between payer and payee | That an address interacted with the pool, and when |

The privacy is the broken *link* between the org's deposit and a recipient's withdrawal - not invisibility of the public legs. Every page of the app states this at the point of action.

## The app

A sidebar dashboard over four modules, with live public metrics (STRK balance, the pool fee read from the contract on every visit, the pool's recent STRK crowd, network) above the working area.

| Module | Purpose |
| :--- | :--- |
| **StealthSplit** | One shielded balance split atomically into per-contributor balances - typed rows or CSV payroll import with per-row validation. Co-workers cannot read each other's allocation. |
| **GhostBounty** | A single private payout to a security researcher, with an onboarding checklist for what the recipient needs first. Disclosing a vulnerability no longer deanonymizes the wallet that gets paid. |
| **StealthGrant** | A whole grant round in one atomic transaction. Each grantee sees only their own award; the recipient list never appears onchain. |
| **Treasury** | Shield, unshield, a consent-gated shielded-balance read, and the **public footprint**: every pool leg the chain can see about the account - and, pointedly, what is absent between them. |

## What makes it different

**1. Privacy checks on both sides.** Before any private operation opens the wallet, Cloakra scans the payer's own public legs for the mistakes that undo privacy - timing correlation, amount echoes (approximate, fee-aware, pairwise sums), thin withdrawal crowds - and warns *before* the wallet opens. On the unshield side it also checks other accounts' recent deposits (equal-share and net-of-fee shapes) and the receiving address's withdrawal cadence. Warnings never block; they turn an accident into a choice. The check is bounded and says so.

**2. Signed payout receipts + an auditor's desk.** One off-chain SNIP-12 signature turns a settled run into per-recipient receipt files committed under a salted Poseidon-Merkle root - each receipt reveals only its own row. Anyone can verify a single receipt at [/verify](https://cloakra-app.vercel.app/verify), or drop a whole run's receipts to get the auditor's view: per-row commitment checks, one signature check against the org account onchain (SNIP-6), settlement + pool-event checks, coverage against the signed recipient count, honest totals that exclude conflicting rows, and a CSV export. A receipt is an **attestation** - the shielded transfer itself is unverifiable by design, and the UI says so.

**3. Self-verifying proof.** The landing page re-verifies the submission's mainnet hashes against Starknet **in the viewer's browser** - finality and execution status. A fabricated hash renders a red NOT FOUND; the claim is falsifiable through the interface itself.

## Mainnet proof

**Seven verified mainnet transactions** are recorded in [`strk20.json`](strk20.json), each gated on `ACCEPTED` + `SUCCEEDED` **and having emitted STRK20 pool events** ([`scripts/verify-tx.mjs`](scripts/verify-tx.mjs); [`scripts/preflight.mjs`](scripts/preflight.mjs) re-runs the sweep across the whole manifest):

| Operation | Transaction |
| :--- | :--- |
| Shield 26 STRK | [`0xcfc2e5…`](https://voyager.online/tx/0xcfc2e5fe5e2d5b56c7ba0c7300700b54269db0ac47b2d2a5c4b4bb7b6b1b93) |
| Unshield 2 STRK | [`0x3f4819…`](https://voyager.online/tx/0x3f4819ae9bf1db30cf6dca75128bfe7b68d767f25249705e8a3d77aff1a3900) |
| Unshield 2 STRK | [`0x39ca2e…`](https://voyager.online/tx/0x39ca2ea1b07036a2cc30931fd0c23139fc54134529000b945b94d8a18b82463) |
| Shield 12 STRK | [`0x14c41d…`](https://voyager.online/tx/0x14c41ddaa5e660b7a89d3ae3dbbe236659d964e544654cb97bb0830ab59aada) |
| Shield 12 STRK | [`0x65748c…`](https://voyager.online/tx/0x65748c3960b0cb5988f29df38d639e33a060797d46043c636ed4f10b94ca58c) |
| Unshield 2 STRK | [`0x4a216f…`](https://voyager.online/tx/0x4a216f67144a4275e6b0f5ba8a4903bbecc7565bbb9fe69c7183e37e98305e6) |
| Unshield 2 STRK | [`0xfc4383…`](https://voyager.online/tx/0xfc4383141cfe4a4b10e02298ee3aae7d9cafbfff8d2c83f4877d131ef212ce) |

The treasury lifecycle (shield → shielded balance → unshield) is hash-proven above. The module flows - private transfer and the atomic split - ride the same wallet API against the same pool but are not yet exercised by a recorded hash; the README says so rather than implying otherwise.

## Architecture

- **No custom contracts.** `strk20InvokeTransaction` accepts an *array* of actions settled in one transaction, so the atomic split needs no bespoke Cairo. Nothing of ours to audit beyond the canonical pool.
- **No backend, no server keys.** A static Next.js app; every operation is signed by the user's own wallet (`WalletAccountV6` in starknet.js, exposing `strk20Balances` / `strk20PrepareInvoke` / `strk20InvokeTransaction`). Cloakra never touches a viewing key.
- **Events, never senders.** Private transactions are relayed, so per-account views read the pool's `Deposit`/`Withdrawal` events - attributing by sender would credit every deposit to the relayer.
- **Receipts are inspected.** starknet.js resolves `waitForTransaction` for reverted transactions; success is confirmed from the receipt's execution status, so a reverted payout is never shown as confirmed.
- **The fee is never hardcoded.** It moved from 4 to 6 STRK mid-sprint; the app reads it live and re-checks at signing time.

Details: [ARCHITECTURE.md](ARCHITECTURE.md) · reviewer's path: [EVALUATE.md](EVALUATE.md) · in-app docs: [/docs](https://cloakra-app.vercel.app/docs)

## Getting started

```bash
cd client
cp .env.local.example .env.local   # add your Starknet mainnet RPC URL
npm install
npm run dev
```

Private operations need a privacy-enabled wallet on Starknet mainnet - [Ready](https://www.ready.co), with private tokens enabled (a one-time in-wallet registration; Ready's flow deposits 6 STRK which the pool fee consumes - verified on mainnet). Other Starknet wallets connect but stay read-only, detected by wallet-API version, never by probing balances.

`.env.local` is gitignored. The RPC URL is a `NEXT_PUBLIC_` var because the browser makes the calls directly - restrict the key by origin in your provider's dashboard rather than treating it as a secret.

## Testing & verification

```bash
cd client && npm test        # 120 tests on the money path
node scripts/verify-tx.mjs <hash>          # one hash: ACCEPTED + SUCCEEDED + pool events
node scripts/preflight.mjs --demo-url <u>  # the whole submission, re-verified onchain
```

## License

Apache-2.0 - see [LICENSE](LICENSE).
