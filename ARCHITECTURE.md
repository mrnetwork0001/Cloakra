# Cloakra — Architecture

A shielded capital-allocation app for organizations on Starknet mainnet,
built on the STRK20 privacy pool through the **Privacy Wallet API route**:
the dapp asks the user's privacy-enabled wallet (Ready) to act; keys, notes,
and proving never leave the wallet.

## The one rule everything follows

**The dapp never touches viewing keys.** Every operation is a
`WalletAccountV6` call signed by the user's own wallet. Cloakra has no
backend, no server keys, and cannot read a shielded balance without the
wallet's consent prompt.

## Stack

| Layer | Choice | Why |
| :--- | :--- | :--- |
| Contracts | **none** | `strk20InvokeTransaction` accepts an *array* of actions settled atomically — the multi-recipient split needs no custom Cairo |
| Wallet API | `starknet@10.4.0` (`WalletAccountV6`) | Ships the STRK20 actions (`strk20Balances`, `strk20PrepareInvoke`, `strk20InvokeTransaction`) |
| Discovery | `get-starknet-discovery@6.0.3` | v6 lives on the npm `next` tag — explicit pins required |
| Frontend | Next.js (App Router) in `client/` | Static + client-side; deployable anywhere |
| Tests | vitest over the money-path helpers | every review-discovered bug has a regression test |

## Flows

```
Treasury tab            StealthSplit / StealthGrant       GhostBounty
────────────            ───────────────────────────       ───────────
shield (deposit)   ──►  one strk20InvokeTransaction  ──►  single private
unshield (withdraw)     with N transfer actions —         transfer to a
public footprint        atomic: all land or none          registered researcher
```

- **Fee honesty**: the flat pool fee is read live from `get_fee_amount`
  (never hardcoded — it changed mid-sprint) and re-checked at signing time.
- **Registration honesty**: dapp-initiated deposits cannot register an
  account; the UI routes users to Ready's one-time "Enable private tokens"
  step and says what it costs.

## Reading the chain honestly

Private transactions are **relayed** — the tx sender is the relayer for every
user, so per-user activity must never be attributed by sender. The public
footprint reads the pool's `Deposit`/`Withdrawal` events (the user's address
is the first indexed key), scanning **backward** from the latest block so
page caps can only ever trim the oldest history, never the newest.

## Submission integrity

- `strk20.json` hashes are gated by `scripts/verify-tx.mjs`: a hash must be
  `ACCEPTED` + `SUCCEEDED` **and have emitted STRK20 pool events** before it
  may be recorded.
- The landing page's proof section re-verifies the recorded hashes against
  Starknet in the viewer's own browser — the claim is falsifiable, not
  asserted: a fabricated hash renders a red "NOT FOUND on mainnet."

## Safety decisions worth naming

- "Confirmed" is only ever shown for execution `SUCCEEDED` —
  `waitForTransaction` resolves for REVERTED transactions, so receipts are
  inspected, never assumed.
- A global busy-lock freezes navigation while any submission is signing or
  pending — a remounted blank form mid-flight is a double-payment trap.
- Back after any outcome clears the form; pre-broadcast failures are recorded
  before the wallet call so they can never vanish silently.
- Addresses are validated against the Stark field prime (the prime aliases
  the zero address) and compared numerically — felts have many spellings.
- Every privacy claim in the UI is scoped to what the route actually
  delivers; the hidden-vs-visible table ships on the landing page.
