# 🛡️ Cloakra

**Autonomous Shielded Capital Allocation & Treasury OS on Starknet Mainnet, powered by the STRK20 Privacy Pool.**

Built for the **STRK20 Private Sprint** (Aug 14 – Aug 31, 2026).

---

## Modules

| Module | Purpose |
| :--- | :--- |
| **StealthGrant** | Shielded quadratic grants and donor matching — voting weights and funding amounts stay private. |
| **GhostBounty** | Private bug bounty payouts for security researchers, without exposing their public wallet identity. |
| **StealthSplit** | Atomic multi-note split settlements that disburse team allocations into individual shielded balances. |
| **Selective Viewing Keys** | Encrypted viewing key export so auditors and tax authorities can verify flows without public de-anonymization. |

## Status

Scaffold only. No contracts compiled, no SDK wired, no transactions executed yet.
Contract and transaction fields in `strk20.json` are marked `pending` until the
router is deployed to Starknet Mainnet and real transaction hashes are captured.

## Layout

```
Cloakra/
├── strk20.json                 # Hackathon config (root-level, required)
├── CLOAKRA_PROJECT_SPEC.md     # Master blueprint
├── CLAUDE_CLOAKRA.md           # Persistent context directive
├── src/
│   ├── contracts/
│   │   ├── cloakra_pool_router.cairo
│   │   └── stealth_split.cairo
│   └── sdk/
│       ├── strk20_client.ts
│       ├── viewing_key_generator.ts
│       └── mainnet_tx_verifier.ts
└── client/                     # Next.js 14 web application
    ├── components/
    └── pages/
```

## Submission checklist

- [ ] `cloakra_pool_router.cairo` declared + deployed to Starknet Mainnet
- [ ] 3 live mainnet transaction hashes recorded in `strk20.json`
- [ ] Selective viewing key export working end to end
- [ ] Live public web demo
- [ ] 3-minute video showcase (human voiceover)
- [ ] Public repo, Apache 2.0

## License

Apache 2.0 — see [LICENSE](LICENSE).
