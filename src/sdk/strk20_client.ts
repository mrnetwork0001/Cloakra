// SPDX-License-Identifier: Apache-2.0
//
// STRK20 Privacy SDK wrapper.
//
// Single place where Cloakra talks to the STRK20 Privacy Pool. Everything that
// touches note secrets lives here so the UI layer never handles them directly.
//
// STATUS: type scaffold. No implementation yet.

export interface CloakraConfig {
  /** Starknet RPC endpoint (mainnet). */
  rpcUrl: string;
  /** STRK20 Privacy Pool contract address. */
  poolAddress: string;
  /** Deployed cloakra_pool_router address. */
  routerAddress: string;
}

export interface ShieldedNote {
  commitment: string;
  /** Encrypted to the recipient's STRK20 viewing pubkey. Never logged. */
  encryptedPayload: string;
}

export interface SplitRecipient {
  /** Recipient's STRK20 shielded address (stealth meta-address). */
  shieldedAddress: string;
  /** Amount in STRK base units. */
  amount: bigint;
}

export interface Strk20Client {
  /** StealthGrant: shield STRK from a public wallet into a grant note. */
  shieldedGrantDeposit(grantId: string, amount: bigint): Promise<string>;

  /** GhostBounty: private transfer to a researcher's shielded address. */
  ghostBountyPayout(
    bountyId: string,
    recipientShieldedAddress: string,
    amount: bigint,
  ): Promise<string>;

  /** StealthSplit: spend one note into many recipient notes atomically. */
  stealthSplitSettlement(recipients: SplitRecipient[]): Promise<string>;

  /** Decrypt and total the caller's own notes. */
  getShieldedBalance(): Promise<bigint>;
}

// TODO(Phase 1):
//   - import the real STRK20 Privacy SDK once the sprint package is published
//   - createCloakraClient(config, account): Strk20Client
//   - each method returns the mainnet tx hash for strk20.json
