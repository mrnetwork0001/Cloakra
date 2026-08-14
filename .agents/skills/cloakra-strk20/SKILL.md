---
name: cloakra-strk20
description: Architecture, guidelines, Cairo specs, and STRK20 integration rules for Cloakra (Autonomous Shielded Capital Allocation OS) built for the STRK20 Private Sprint on Starknet Mainnet.
---

# 🛡️ Cloakra — STRK20 Private Sprint Skill & Execution Guide

Use this skill whenever working on, reviewing, or developing **Cloakra** — the Autonomous Shielded Capital Allocation OS for the STRK20 Private Sprint on Starknet Mainnet.

## 📌 Project Overview & Hackathon Targets
- **Target Event:** STRK20 Private Sprint (Aug 14 – Aug 31, 2026)
- **Target Network:** Starknet Mainnet
- **Prize Target:** $5,000 USD Pool in STRK ($2,500 1st place)
- **Core Modules:**
  1. **StealthGrant:** Private quadratic funding & confidential donor voting.
  2. **GhostBounty:** Shielded bug bounties for white-hat security researchers.
  3. **StealthSplit:** Atomic multi-note split payouts for team allocations.
  4. **Viewing Keys:** Encrypted viewing key export for auditor compliance.

## 🏗️ Technical Architecture Rules

### 1. STRK20 Privacy Pool & SDK
- Import and wrap the STRK20 Privacy SDK for deposit, transfer, and note-spend operations.
- Generate encrypted note commitments on Starknet Mainnet.

### 2. Mandatory Mainnet Requirements
- Must provide at least 3 live mainnet transaction hashes in `strk20.json`.
- Must maintain `strk20.json` config at repository root.
- Export selective viewing keys via `viewing_key_generator.ts`.

### 3. Submission Artifacts
- 3-minute video demo (real human voiceover, no AI voice).
- Public live mainnet web interface.
