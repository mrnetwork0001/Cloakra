// SPDX-License-Identifier: Apache-2.0
//
// Starknet Mainnet transaction verifier.
//
// Guards the submission requirement: every tx_hash written into strk20.json
// must resolve to a real, ACCEPTED_ON_L2 (or better) transaction on mainnet.
// Run this before submitting — a placeholder or testnet hash fails the check.
//
// STATUS: type scaffold. No implementation yet.

export type TxFinality =
  | "RECEIVED"
  | "ACCEPTED_ON_L2"
  | "ACCEPTED_ON_L1"
  | "REVERTED"
  | "NOT_FOUND";

export interface VerifiedTx {
  txHash: string;
  finality: TxFinality;
  blockNumber?: number;
  voyagerUrl: string;
  verified: boolean;
}

// TODO(Phase 2):
//   - verifyTx(rpcUrl, txHash): Promise<VerifiedTx>
//   - verifyStrk20Json(path): fail loudly on any pending/empty/unverified hash
//   - expose as `npm run verify:mainnet` in scripts/
