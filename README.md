# 🛡️ Cloakra

**Shielded capital allocation on Starknet Mainnet, powered by the STRK20 Privacy Pool.**

Grants, bug bounties, and contributor payouts are the most identity-revealing transactions an organization makes. Paying a security researcher publicly links their wallet to the disclosure. Splitting a team grant on-chain shows every contributor what everyone else was paid. Cloakra moves those flows into the STRK20 pool — and keeps them auditable.

Built for the **STRK20 Private Sprint** (Aug 14 – Aug 31, 2026).

---

## Modules

| Module | Purpose |
| :--- | :--- |
| **StealthSplit** | One funded note split atomically into per-contributor shielded balances. Co-workers cannot read each other's allocation. |
| **GhostBounty** | Bounty payouts to a researcher's shielded balance, so disclosing a vulnerability does not deanonymize the wallet that receives payment. |
| **Selective Viewing Keys** | Scoped, encrypted key export — an auditor verifies one grant round or tax year without any of it becoming public. |
| **StealthGrant** | Shielded grant disbursement over the same rails. |

## Status

**Day 1 of 16.** The dapp shell runs: wallet discovery, connection, and a mainnet chain guard. No pool transactions yet — `strk20.json` fields fill in as they come to exist.

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
- [ ] Selective viewing key export working end to end
- [ ] Live public web demo
- [ ] 3-minute video showcase (human voiceover)

## License

Apache 2.0 — see [LICENSE](LICENSE).
