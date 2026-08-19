/**
 * The account's PUBLIC pool footprint, read from the pool's events over our
 * own RPC. This is exactly — and only — what any block explorer can see:
 * the ERC-20 legs. Private transfers and splits emit nothing linkable here.
 *
 * Event layouts verified against the deployed pool ABI (2026-08-19):
 *   Deposit    keys=[selector, user_addr, token]  data=[amount]           (1 felt)
 *   Withdrawal keys=[selector, to_addr,   token]  data=[EncUserAddr(3), amount] (4 felts)
 * Never attribute by transaction sender — private txs are relayed, so the
 * sender is the relayer for every user. Events are the only truth.
 *
 * Scan design (verified live): nodes page chronologically ASCENDING and may
 * return empty pages with a continuation token while they scan. A forward
 * scan capped by pages therefore drops the NEWEST events — so we scan
 * BACKWARD in sub-ranges from the latest block down to the pool's deployment
 * era. Newest entries are always complete; running out of budget drops only
 * the oldest, which is what the UI says.
 */

import { hash } from "starknet";
import { getProvider } from "./pool";
import { STRK20_POOL_ADDRESS } from "./config";

const DEPOSIT_SELECTOR = hash.getSelectorFromName("Deposit");
const WITHDRAWAL_SELECTOR = hash.getSelectorFromName("Withdrawal");

/** Earliest observed pool event is block 9,023,083 (2026-04-21); scan floor
 * sits safely below it. */
const POOL_DEPLOYMENT_BLOCK = 9_000_000;
const SUB_RANGE_BLOCKS = 500_000;
const MAX_RPC_CALLS = 30;
const CHUNK_SIZE = 1000;

export interface FootprintEntry {
  kind: "deposit" | "withdrawal";
  token: string;
  /** Raw base units. */
  amount: bigint;
  txHash: string;
  /** null while the event's block is still pre-confirmed. */
  blockNumber: number | null;
}

/** Expected data widths; a pool upgrade that appends fields must surface as
 * skipped entries, never as wrong amounts. */
const DATA_WIDTH = { deposit: 1, withdrawal: 4 } as const;
const AMOUNT_INDEX = { deposit: 0, withdrawal: 3 } as const;

export async function fetchPublicFootprint(
  address: string,
): Promise<{ entries: FootprintEntry[]; truncated: boolean; skipped: number }> {
  const provider = getProvider();
  const latest = await provider.getBlockNumber();
  // One deterministic felt spelling — key matching is by value, but never
  // hand the node an ambiguous padding.
  const filterAddress = "0x" + BigInt(address).toString(16);

  const entries: FootprintEntry[] = [];
  let skipped = 0;
  let callsLeft = MAX_RPC_CALLS;
  let hi = latest;
  let truncated = false;

  while (hi >= POOL_DEPLOYMENT_BLOCK) {
    const lo = Math.max(POOL_DEPLOYMENT_BLOCK, hi - SUB_RANGE_BLOCKS + 1);

    let continuationToken: string | undefined;
    do {
      if (callsLeft-- <= 0) {
        truncated = true;
        break;
      }
      const page = await provider.getEvents({
        address: STRK20_POOL_ADDRESS,
        // Position 0: either event selector. Position 1: our address — the
        // depositor on Deposit, the public recipient on Withdrawal.
        keys: [[DEPOSIT_SELECTOR, WITHDRAWAL_SELECTOR], [filterAddress]],
        from_block: { block_number: lo },
        to_block: { block_number: hi },
        chunk_size: CHUNK_SIZE,
        continuation_token: continuationToken,
      });

      for (const ev of page.events) {
        const kind =
          BigInt(ev.keys[0]) === BigInt(DEPOSIT_SELECTOR)
            ? ("deposit" as const)
            : ("withdrawal" as const);
        if (ev.data.length !== DATA_WIDTH[kind]) {
          // Layout drift (pool upgrade?) — omit rather than show wrong numbers.
          skipped++;
          console.warn("[cloakra] unexpected", kind, "event data width:", ev.data.length);
          continue;
        }
        entries.push({
          kind,
          token: ev.keys[2],
          amount: BigInt(ev.data[AMOUNT_INDEX[kind]]),
          txHash: ev.transaction_hash,
          blockNumber: ev.block_number ?? null,
        });
      }
      continuationToken = page.continuation_token;
    } while (continuationToken);

    if (truncated) break;
    hi = lo - 1;
  }

  // Newest first; pre-confirmed (null block) sorts newest of all.
  entries.sort(
    (a, b) =>
      (b.blockNumber ?? Number.MAX_SAFE_INTEGER) -
      (a.blockNumber ?? Number.MAX_SAFE_INTEGER),
  );
  return { entries, truncated, skipped };
}
