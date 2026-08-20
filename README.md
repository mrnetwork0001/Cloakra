# 🛡️ Cloakra

**Shielded capital allocation on Starknet Mainnet, powered by the STRK20 Privacy Pool.**

Grants, bug bounties, and contributor payouts are the most identity-revealing transactions an organization makes. Paying a security researcher publicly links their wallet to the disclosure. Splitting a team grant on-chain shows every contributor what everyone else was paid. Cloakra settles those flows inside the STRK20 pool — who receives and how much stays private; the pool's public legs stay public.

Built for the **STRK20 Private Sprint** (Aug 14 – Aug 31, 2026).

---

## Modules

| Module | Purpose |
| :--- | :--- |
| **StealthSplit** | One funded note split atomically into per-contributor shielded balances. Co-workers cannot read each other's allocation. |
| **GhostBounty** | Bounty payouts to a researcher's shielded balance, so disclosing a vulnerability does not deanonymize the wallet that receives payment. |
| **StealthGrant** | Shielded grant disbursement over the same rails. |

## What's private, what isn't

| Private (inside the pool) | Public (visible onchain) |
| :--- | :--- |
| Who receives a split, bounty, or grant | The org's deposits into the pool (address + amount) |
| Per-recipient amounts | Any withdrawal to a public wallet (address + amount) |
| The link between payer and payee | That an address interacted with the pool, and when |

The privacy is the broken *link* between the org's deposit and a recipient's withdrawal — not invisibility of the public legs. Recipients need a privacy-enabled wallet ([Ready](https://www.ready.co)) with private tokens enabled — a one-time in-wallet registration step (Ready's flow deposits 6 STRK, which the pool fee consumes; verified on mainnet).

## Status

**Live on Starknet mainnet.** The treasury lifecycle — shield → shielded balance → unshield — has been executed through this UI against the canonical pool, and **three verified mainnet transaction hashes are recorded in [`strk20.json`](strk20.json)** (each gated on `ACCEPTED` + `SUCCEEDED` via [`scripts/verify-tx.mjs`](scripts/verify-tx.mjs)). The module flows — private transfer and the atomic split — ride the same wallet API against the same pool but have not yet been exercised by a recorded hash. Also ships: a consent-gated shielded-balance read and a public-footprint view built from the pool's `Deposit`/`Withdrawal` events. Integration plan: [STRK20_INTEGRATION_PLAN.md](STRK20_INTEGRATION_PLAN.md).

Cloakra integrates the pool through **`WalletAccountV6`** in starknet.js, which exposes the STRK20 privacy actions (`strk20Balances`, `strk20PrepareInvoke`, `strk20InvokeTransaction`) directly. Because `strk20InvokeTransaction` accepts an *array* of actions settled in one transaction, StealthSplit's atomic one-note-to-many-recipients payout needs no custom Cairo contract. Every operation is signed by the user's own wallet; no key material is ever held server-side.

## Getting started

Requires **Node ≥ 24**.

```bash
cd client
cp .env.local.example .env.local   # add your own Alchemy key
npm install
npm run dev
```

Mainnet is `SN_MAIN`. The canonical STRK20 privacy pool is
[`0x040337b1…ffe812a`](https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a).

`.env.local` is gitignored. The RPC URL is a `NEXT_PUBLIC_` var because the browser makes the calls directly — restrict the key by domain in the Alchemy dashboard rather than treating it as a secret.

### Pinned versions

Both wallet libraries need explicit pins; npm's `latest` tag resolves to the wrong major.

| Package | Pin | Why |
| :--- | :--- | :--- |
| `starknet` | `10.4.0` | Ships `WalletAccountV6` with the STRK20 actions. `latest` is still 10.0.x. |
| `@starknet-io/get-starknet-discovery` | `6.0.3` | v6 lives on the `next` tag; `latest` is 5.0.0-beta. |
| `@starknet-io/get-starknet-wallet-standard` | `6.0.3` | Same. |

## Layout

```
Cloakra/
├── strk20.json              # Hackathon config (root-level, required)
└── client/                  # Next.js application
    ├── app/                 # App Router pages
    ├── components/          # WalletPanel, module UIs
    └── lib/                 # config + wallet/STRK20 wiring
```

## Submission checklist

- [x] Public repo, Apache 2.0
- [ ] 3 live mainnet transaction hashes recorded in `strk20.json`
- [ ] Live public web demo
- [ ] 3-minute video showcase (human voiceover)

## License

Apache 2.0 — see [LICENSE](LICENSE).
