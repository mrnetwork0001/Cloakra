// SPDX-License-Identifier: Apache-2.0
//
// StealthSplit — atomic multi-note split handler (Cairo 2.x)
//
// Takes a single shielded input note and splits it into N recipient notes in
// one transaction. Co-workers each receive an independent shielded balance and
// cannot inspect one another's allocation.
//
// Invariant to enforce in Phase 1:
//   sum(output note values) + fee == input note value   (proven in ZK, off-chain)
//   all-or-nothing: a single failed output reverts the whole settlement
//
// STATUS: interface scaffold. No implementation yet.

#[starknet::interface]
trait IStealthSplit<TContractState> {
    /// Execute the split. `output_commitments` is bounded by MAX_SPLIT_OUTPUTS.
    fn split(
        ref self: TContractState,
        input_nullifier: felt252,
        output_commitments: Span<felt252>,
        proof: Span<felt252>,
    );

    fn max_outputs(self: @TContractState) -> u32;
}

// TODO(Phase 1):
//   - const MAX_SPLIT_OUTPUTS: u32 (bound loop cost / calldata size)
//   - reject duplicate commitments within a single split
//   - reject already-spent input_nullifier
//   - emit SplitSettled { input_nullifier, output_count }
