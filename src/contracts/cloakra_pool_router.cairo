// SPDX-License-Identifier: Apache-2.0
//
// Cloakra Pool Router — Starknet Mainnet (Cairo 2.x)
//
// Routes shielded capital flows through the STRK20 Privacy Pool for the three
// Cloakra modules. The router never holds plaintext amounts or recipient
// identities: it forwards note commitments and ZK proofs to the pool and emits
// only commitment/nullifier data.
//
// STATUS: interface scaffold. No implementation yet.

use starknet::ContractAddress;

/// A shielded note commitment produced by the STRK20 SDK off-chain.
#[derive(Drop, Serde, Copy)]
struct NoteCommitment {
    commitment: felt252,
    encrypted_payload_hash: felt252,
}

#[starknet::interface]
trait ICloakraRouter<TContractState> {
    /// StealthGrant — shield an STRK deposit into the pool as a grant note.
    /// Emits the commitment; the funding amount stays private.
    fn shielded_grant_deposit(
        ref self: TContractState,
        grant_id: felt252,
        note: NoteCommitment,
        proof: Span<felt252>,
    );

    /// GhostBounty — pay a researcher via a shielded transfer.
    /// The recipient's public wallet is never referenced on-chain.
    fn ghost_bounty_payout(
        ref self: TContractState,
        bounty_id: felt252,
        nullifier: felt252,
        output_note: NoteCommitment,
        proof: Span<felt252>,
    );

    /// StealthSplit — atomically spend one note into N recipient notes.
    /// Either every output note is created, or the call reverts.
    fn stealth_split_settlement(
        ref self: TContractState,
        input_nullifier: felt252,
        output_notes: Span<NoteCommitment>,
        proof: Span<felt252>,
    );

    /// Register the hash of an encrypted selective viewing key for an auditor.
    /// Only the hash is stored on-chain; the key itself is delivered off-chain.
    fn register_viewing_key(
        ref self: TContractState,
        scope_id: felt252,
        auditor: ContractAddress,
        viewing_key_hash: felt252,
    );

    fn strk20_pool(self: @TContractState) -> ContractAddress;
}

// TODO(Phase 1):
//   - #[starknet::contract] mod CloakraRouter { ... }
//   - storage: pool address, nullifier set, viewing key registry, admin
//   - events: GrantDeposited, BountyPaid, SplitSettled, ViewingKeyRegistered
//   - nullifier double-spend guard before every pool dispatch
