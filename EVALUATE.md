# Evaluating Cloakra in 5 minutes

Everything below is independently verifiable - no trust in this README
required. The live deployment is linked from the sprint hub.

## 1. The mainnet proof (60 seconds)

Open the live app's landing page and scroll to **Submission proof**. The
three transactions recorded in [`strk20.json`](strk20.json) are verified
against Starknet **in your browser as you watch** - finality AND execution
status. Green means `ACCEPTED · SUCCEEDED`. This panel can fail (a fabricated
hash renders a red "NOT FOUND"), which is what makes its passing meaningful.

Prefer your own tooling? The hashes, on Voyager:

| Operation | Transaction |
| :--- | :--- |
| Shield 26 STRK | [`0xcfc2e5…`](https://voyager.online/tx/0xcfc2e5fe5e2d5b56c7ba0c7300700b54269db0ac47b2d2a5c4b4bb7b6b1b93) |
| Unshield 2 STRK | [`0x3f4819…`](https://voyager.online/tx/0x3f4819ae9bf1db30cf6dca75128bfe7b68d767f25249705e8a3d77aff1a3900) |
| Unshield 2 STRK | [`0x39ca2e…`](https://voyager.online/tx/0x39ca2ea1b07036a2cc30931fd0c23139fc54134529000b945b94d8a18b82463) |

Or run the repo's own gate (public RPC fallback included):
`node scripts/verify-tx.mjs <hash>` - requires `ACCEPTED` + `SUCCEEDED` +
**emitted STRK20 pool events**.

## 2. The live app (2 minutes)

You need the [Ready](https://www.ready.co) wallet on Starknet mainnet. Then:

1. **Open the app** → connect. Capability detection is a version query - the
   app never reads wallet data to feature-detect.
2. **Shield tab**: the pool fee is read live from the contract (it changed
   mid-sprint from 4 to 6 STRK - nothing here hardcodes it).
3. **StealthSplit**: add recipients or paste a CSV payroll - every row passes
   the same validation as typed input. One confirm settles all transfers in
   one atomic transaction.
4. **Treasury → Public footprint**: everything the chain shows about your
   account's pool use - and notably, what is *absent* from it.

Without a wallet, the landing page's proof section and live-fee line still
demonstrate the mainnet integration.

## 3. The honesty claim (90 seconds)

Cloakra's differentiator is that it never overclaims. Check us on it:

- The landing page's **"What's private, what isn't"** table states that
  deposits, withdrawals, and pool-interaction timing are public.
- Every flow labels its public legs at the point of action - the Shield
  screen calls the deposit "the public leg"; Unshield warns that timing and
  amount correlation is always possible.
- The [README](README.md) distinguishes the hash-proven treasury legs from
  the module flows that ride the same rails but have no recorded hash yet.

## 4. The engineering (90 seconds)

- [ARCHITECTURE.md](ARCHITECTURE.md) - stack, flows, and safety decisions
  (why "confirmed" requires checking the receipt's execution status; why the
  event scan runs backward; why a busy-lock freezes navigation mid-submit).
- `client/lib/__tests__/` - the money-path test suite. Every bug found by
  review carries a regression test: the field-prime-aliases-zero address
  hole, dust amounts rendering as "0", "abort" misread as user refusal,
  CSV header rows silently eating a payee.
- Zero custom contracts, zero server keys: the entire attack surface is a
  static frontend plus the user's own wallet.
