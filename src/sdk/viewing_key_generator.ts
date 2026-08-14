// SPDX-License-Identifier: Apache-2.0
//
// Selective Viewing Key export.
//
// Produces a scoped, encrypted viewing key that lets an auditor decrypt a
// bounded slice of Cloakra activity (one grant round, one bounty program, one
// tax year) without revealing anything outside that scope, and without making
// the contributor's identity public on-chain.
//
// STATUS: type scaffold. No implementation yet.

export interface ViewingKeyScope {
  /** Which module's notes this key can decrypt. */
  module: "StealthGrant" | "GhostBounty" | "StealthSplit";
  /** Optional narrowing: a specific grant/bounty/settlement id. */
  subjectId?: string;
  /** Inclusive UTC bounds for the audit window. */
  fromTimestamp: number;
  toTimestamp: number;
}

export interface ExportedViewingKey {
  /** Encrypted to the auditor's public key. */
  ciphertext: string;
  /** Poseidon hash registered on-chain via register_viewing_key. */
  keyHash: string;
  scope: ViewingKeyScope;
}

export interface AuditEntry {
  txHash: string;
  module: ViewingKeyScope["module"];
  amount: bigint;
  timestamp: number;
}

// TODO(Phase 3):
//   - deriveScopedViewingKey(masterKey, scope): scoped key material
//   - exportViewingKey(scope, auditorPubKey): ExportedViewingKey
//   - verifyViewingKey(exported, auditorPrivKey): AuditEntry[]
//   - never write raw key material to disk or logs
