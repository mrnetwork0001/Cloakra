# STRK20 Privacy Integration Plan — Cloakra

Generated 2026-08-16 by the strk20-privacy-integration skill. Statuses below were current at generation time — re-verify the tracked items before building against them.

## 1. Project snapshot

- Stack: Next.js 16.3.1 (App Router, React 19) in `client/`; `starknet@10.4.0`; `@starknet-io/get-starknet-discovery@6.0.3` + `@starknet-io/get-starknet-wallet-standard@6.0.3`; `@starknet-io/types-js@0.10.3`. No Cairo contracts, no backend, no server-held keys, no test tooling yet.
- Relevant code:
  - Wallet connection: `client/lib/wallet.ts:49` (`WalletAccountV6.connect` via get-starknet v6 store)
  - Connection UI + chain guard: `client/components/WalletPanel.tsx`
  - Addresses + RPC config: `client/lib/config.ts` (mainnet pool `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`, STRK token, `NEXT_PUBLIC_STARKNET_RPC_URL`)
  - Transaction layer: does not exist yet — STRK20 actions will be its first occupant (`client/lib/strk20.ts`, new)
- Privacy goal (from interview): **hide who receives and how much** in organizational payouts — team splits (StealthSplit) and bounty payouts (GhostBounty). The org's deposit into the pool stays public (ERC-20 leg) and that is accepted. The viewing-keys/compliance module is **dropped from scope** (interview decision, 2026-08-16): a dapp can never hold or export viewing keys, so the module as originally specced is not buildable on any route.
- Environment: **Starknet mainnet, no testnet rehearsal** (interview decision — accepted cost: each pool operation carries a flat fee in STRK and mistakes are unrecoverable). Wallet: Ready extension, being installed today; two accounts required to demo a split.

## 2. Chosen route: Privacy Wallet API via starknet.js

Cloakra is a normal dapp — users connect their own wallet, no server-side accounts, no protocol-specific DeFi actions (shield / private transfer / unshield cover every flow). That is the Wallet API route: the dapp asks the user's privacy-enabled wallet to act via `WalletAccountV6`; the wallet handles registration, keys, notes, and proving. No anonymizer contract is needed because no action goes beyond the pool's native operations — `strk20InvokeTransaction(actions)` takes an array, so the atomic multi-recipient split is a batch of `transfer` actions in one wallet request, not custom Cairo.

**The rule this follows:** this app never touches viewing keys — the user's wallet acts on its behalf via starknet.js.

## 3. What this delivers — hidden vs visible

| Private | Public |
|---|---|
| Who receives a split or bounty payout | The org's shield deposits: depositing address + amount (the ERC-20 leg) |
| Per-recipient amounts inside the pool | Any unshield withdrawal: destination address + amount (the ERC-20 leg) |
| The link between payer and payee | The fact that an address interacted with the pool, and when |
| Which notes were spent | — |

Honest limits: when a recipient unshields to a public wallet, that withdrawal amount and address are public — the privacy is the broken *link* between the org's deposit and the recipient's withdrawal, not invisibility of the legs. A recipient who wants to stay shielded simply doesn't unshield. Recipients must hold a privacy-enabled wallet (registration happens automatically in-wallet on first use); GhostBounty's UX must say this before a payout is attempted.

## 4. Prerequisites & versions

- `starknet@10.4.0` — installed ✅ (npm `next` is 10.7.0; do not upgrade mid-sprint without need)
- `@starknet-io/get-starknet-discovery@6.0.3`, `@starknet-io/get-starknet-wallet-standard@6.0.3` — installed ✅ (`next` moved to 6.0.4 — tracked below, not blocking)
- `@starknet-io/types-js@0.10.3` — installed ✅ (matches wallet-API spec v0.10.3, latest stable)
- Test wallet: **Ready extension only** (Xverse dapp-facing support in progress; Argent X / Braavos unsupported — current `WalletPanel.tsx` copy names them and must be fixed)
- Two funded Ready accounts on mainnet (split demo needs a payer and a recipient)

## 5. Phase 1 — capability detection, honest copy, shielded balance ✅ done 2026-08-16

1. New `client/lib/strk20.ts`: capability detection via a **version query** (`walletV6.supportedWalletApi(wallet)` / `supportedSpecs`, treat wallet-API ≥ 0.10 as STRK20-capable). **Never probe `strk20Balances` to feature-detect** — it is consent-gated; least privilege.
2. `client/components/WalletPanel.tsx`: replace "Install Argent X or Braavos" with Ready; on connect, detect capability and degrade gracefully — non-privacy wallets see the app read-only with a "requires a privacy-enabled wallet (Ready)" prompt, not a broken UI.
3. Shielded balance panel as a **deliberate, user-triggered feature** (button → `strk20Balances([STRK])` → wallet consent prompt → display). Not auto-loaded on connect.
4. `README.md`: remove the dropped viewing-keys module from the table; adjust copy to the honest hidden/visible story.
5. Verify headlessly (`npm run build`), then manually against the Ready extension and the wallet test dapp (https://starknet-wallet-account.vercel.app/).

## 6. Phase 2 — mainnet flows: shield, private transfer, split, unshield (Days 4–7)

Each mainnet-affecting action is executed only with the developer's explicit go at that moment (no testnet stage exists in this plan — the interview chose straight-to-mainnet).

1. **Shield** (`{type:'deposit'}`): two transactions by design — ERC-20 `approve`, then the private deposit. Name both steps in the UI; users read the second prompt as a duplicate-tx bug otherwise. Record tx hash → `strk20.json.transactions[0]`.
2. **Private transfer** (`{type:'transfer'}`): account A → account B. Notes mature ~10 blocks after shielding — do not chain a transfer immediately after a shield; the wait is also what unlinks the deposit from the transfer (bundling them into one tx would publish "this address funded this transfer"). Record hash → `transactions[1]`.
3. **StealthSplit settlement**: one `strk20InvokeTransaction([transfer × N])` batch — atomic, one wallet request. Record hash → `transactions[2]`.
4. **Unshield** (`{type:'withdraw'}`): recipient side, to show the full lifecycle.
5. Read the flat pool fee from the pool (`get_fee_amount`) at build time — do not hardcode (~4 STRK at last check); subtract it when pre-filling MAX amounts or the operation fails after signing. Give `waitForTransaction` a timeout ceiling; on timeout show "submitted" + Voyager link. Normalize addresses with `BigInt(a) === BigInt(b)` before comparing.

## 7. Phase 3 — product surfaces (Days 8–12)

- StealthSplit screen (hero): recipient rows, amounts, running total, fee line read from the pool, one confirm → one wallet request.
- GhostBounty: same transfer primitive; UX states the recipient-needs-a-privacy-wallet prerequisite up front.
- Payout activity view: **never attribute by transaction sender** — private txs are relayed, so the sender is the relayer for every user. Anything per-user reads the pool's `Deposit` event and filters on its **first indexed key (topic1)**.
- Honest labeling throughout per the hidden/visible table; no compliance framing (module dropped).

## 8. Testing

- No testnet stage (interview decision). Mitigation: Phase 1 ships capability detection + balance read (no funds at risk); the first funds-at-risk action is the Phase 2 shield, smallest sensible amount first.
- Manual verification each phase against the Ready extension; sanity-check wallet behavior against https://starknet-wallet-account.vercel.app/.
- Headless gate per phase: clean `npm run build` + typecheck. No test framework exists in the repo; if one is added, wallet interactions stay manual (local devnet does not exercise the wallet/proving path).

## 9. Compliance & security notes

- Deposit screening is enforced onchain by the protocol on every route; a deposit can be declined by screening — surface that state in UX as a state, not an error bug.
- Selective disclosure exists at the protocol level for legitimate regulatory requests; it is not automatic compliance and carries no regulator endorsement. Cloakra's compliance module is dropped; no UI may imply key export or audit capability.
- The dapp holds no key material of any kind; RPC key ships to the browser by design (`NEXT_PUBLIC_`) and is restricted by domain in the Alchemy dashboard, not treated as a secret.

Phase 1 note (2026-08-16): a 15-agent adversarial review confirmed 10 unique findings, all fixed before commit — the chain guard now reads the wallet's chain (`walletV6.requestChainId`) and compares felts numerically; in-wallet account/network switches are followed via `account.onChange`; declining a chain switch or balance read is handled as a routine outcome (`USER_REFUSED_OP`), not a session teardown; connect has a cancel path and a disconnect exists; dust balances render as `< 0.0001` instead of `0`; viewing-key/compliance wording removed from public copy.

## 10. Open items to re-verify at build time

- get-starknet `next` moved 6.0.3 → 6.0.4 — check the changelog before any upgrade; 6.0.3 pins hold for now.
- Fee UX: wallet flows sponsor gas but not pool fees; paymaster-based fee estimation still being designed — re-check at Phase 2.
- ~~Exact consent behavior of `strk20Balances` in the current Ready extension build~~ **Confirmed 2026-08-16 against Ready on mainnet:** an unregistered account gets an instant typed `NOT_REGISTERED` (code 118) rejection *before* any consent prompt. The UI now treats it as an informational state ("registers automatically on first shield"), not an error. Consent-prompt behavior for a *registered* account still unobserved — verify right after the Phase 2 shield.
- Xverse dapp-facing Wallet API status (would widen wallet support beyond Ready).
- Whether one `strk20InvokeTransaction` batch pays one flat pool fee or one per action — read from the pool / test with the smallest split first; drives StealthSplit's fee line.

## 11. Links

- WalletAccount guide (fetch before writing wallet code): https://starknet-js.com/docs/next/guides/account/walletAccount/#with-get-starknet-v6
- Wallet API by example: https://strk20-by-example.org/starknet-wallet-api/overview · https://strk20-by-example.org/starknet-wallet-api/starknet-js
- Pool (mainnet, canonical): https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a
- Wallet test dapp: https://starknet-wallet-account.vercel.app/
- Docs mirror (local): `docs/strk20-llms-full.txt`
