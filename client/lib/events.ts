/**
 * The pool's PUBLIC event footprint, read over our own RPC. This is exactly -
 * and only - what any block explorer can see: the ERC-20 legs. Private
 * transfers and splits emit nothing linkable here.
 *
 * Event layouts verified against the deployed pool ABI (2026-08-19):
 *   Deposit    keys=[selector, user_addr, token]  data=[amount]           (1 felt)
 *   Withdrawal keys=[selector, to_addr,   token]  data=[EncUserAddr(3), amount] (4 felts)
 * Never attribute by transaction sender - private txs are relayed, so the
 * sender is the relayer for every user. Events are the only truth.
 *
 * Scan design (verified live): nodes page chronologically ASCENDING and may
 * return empty pages with a continuation token while they scan. A forward
 * scan capped by pages therefore drops the NEWEST events - so we scan
 * BACKWARD in sub-ranges from the latest block down to the pool's deployment
 * era, and a sub-range cut short by the budget is discarded whole. Newest
 * entries are therefore always complete; running out of budget drops only
 * the oldest, which is what the UI says.
 *
 * Two readers share one scanner: the per-account footprint (keyed on the
 * account) and the pool-wide activity feed (no account key), which the
 * recipient-side privacy check and the dashboard use.
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

/** Pool-wide reads are bounded harder: they are a privacy aid and a
 * dashboard figure, not an audit trail. ~19 hours at the measured 1.7s
 * block time. */
export const ACTIVITY_LOOKBACK_BLOCKS = 40_000;
const ACTIVITY_MAX_RPC_CALLS = 8;
const ACTIVITY_CACHE_MS = 30_000;
/** Pool-wide scans walk small newest-first slices (~2.4 h each) so a budget
 * cut costs the oldest slices, never the newest. */
const ACTIVITY_SUB_RANGE_BLOCKS = 5_000;

export interface FootprintEntry {
  kind: "deposit" | "withdrawal";
  /** keys[1], normalized: the depositor on Deposit, the public recipient on
   * Withdrawal. The only account the chain names for the leg. */
  account: string;
  token: string;
  /** Raw base units. */
  amount: bigint;
  txHash: string;
  /** null while the event's block is still pre-confirmed. */
  blockNumber: number | null;
}

export interface EventScan {
  /** Newest first; pre-confirmed (null block) sorts newest of all. */
  entries: FootprintEntry[];
  /** True when the RPC budget ran out before the floor - the OLDEST part of
   * the window is missing, never the newest. */
  truncated: boolean;
  /** Events omitted because their layout was unexpected. */
  skipped: number;
  /** The latest block at scan time - entries are relative to it. */
  latest: number;
  /** Blocks completely covered, counting down from `latest`. Equals the
   * requested window unless truncated. */
  coveredBlocks: number;
}

/** Expected data widths; a pool upgrade that appends fields must surface as
 * skipped entries, never as wrong amounts. */
const DATA_WIDTH = { deposit: 1, withdrawal: 4 } as const;
const AMOUNT_INDEX = { deposit: 0, withdrawal: 3 } as const;

/** Pure per-event parser - returns null for anything it cannot read:
 * layout drift (unknown widths), an unknown selector, or an unreadable felt.
 * One odd event must never take the whole scan down. */
export function parseFootprintEvent(ev: {
  keys: string[];
  data: string[];
  transaction_hash: string;
  block_number?: number;
}): FootprintEntry | null {
  try {
    if (ev.keys.length < 3) return null;
    const selector = BigInt(ev.keys[0]);
    const kind =
      selector === BigInt(DEPOSIT_SELECTOR)
        ? ("deposit" as const)
        : selector === BigInt(WITHDRAWAL_SELECTOR)
          ? ("withdrawal" as const)
          : null;
    if (kind === null) return null;
    if (ev.data.length !== DATA_WIDTH[kind]) return null;
    return {
      kind,
      account: "0x" + BigInt(ev.keys[1]).toString(16),
      token: ev.keys[2],
      amount: BigInt(ev.data[AMOUNT_INDEX[kind]]),
      txHash: ev.transaction_hash,
      blockNumber: ev.block_number ?? null,
    };
  } catch {
    return null;
  }
}

async function scanPoolEvents(opts: {
  keys: string[][];
  maxLookbackBlocks?: number;
  maxRpcCalls: number;
  subRangeBlocks?: number;
}): Promise<EventScan> {
  const provider = getProvider();
  const latest = await provider.getBlockNumber();
  const subRange = opts.subRangeBlocks ?? SUB_RANGE_BLOCKS;

  const entries: FootprintEntry[] = [];
  let skipped = 0;
  let callsLeft = opts.maxRpcCalls;
  let hi = latest;
  let truncated = false;
  let coveredDownTo = latest + 1;
  // A caller that only needs recent history (summaries, checks) can bound
  // the scan instead of walking back to the pool's deployment era.
  const floor = opts.maxLookbackBlocks
    ? Math.max(POOL_DEPLOYMENT_BLOCK, latest - opts.maxLookbackBlocks)
    : POOL_DEPLOYMENT_BLOCK;

  while (hi >= floor) {
    const lo = Math.max(floor, hi - subRange + 1);

    // Pages within a sub-range arrive OLDEST first, so a sub-range cut short
    // by the budget is missing its newest events. Buffer it and keep it only
    // when complete - then everything returned is complete from `latest`
    // down to `coveredDownTo`, and the loss is always the oldest part.
    const batch: FootprintEntry[] = [];
    let batchSkipped = 0;
    let continuationToken: string | undefined;
    do {
      if (callsLeft-- <= 0) {
        truncated = true;
        break;
      }
      const page = await provider.getEvents({
        address: STRK20_POOL_ADDRESS,
        keys: opts.keys,
        from_block: { block_number: lo },
        to_block: { block_number: hi },
        chunk_size: CHUNK_SIZE,
        continuation_token: continuationToken,
      });

      for (const ev of page.events) {
        const parsed = parseFootprintEvent(ev);
        if (parsed === null) {
          // Layout drift (pool upgrade?) - omit rather than show wrong numbers.
          batchSkipped++;
          console.warn("[cloakra] unreadable pool event:", ev.keys.length, ev.data.length);
          continue;
        }
        batch.push(parsed);
      }
      continuationToken = page.continuation_token;
    } while (continuationToken);

    if (truncated) break;
    entries.push(...batch);
    skipped += batchSkipped;
    coveredDownTo = lo;
    hi = lo - 1;
  }

  entries.sort(
    (a, b) =>
      (b.blockNumber ?? Number.MAX_SAFE_INTEGER) -
      (a.blockNumber ?? Number.MAX_SAFE_INTEGER),
  );
  return { entries, truncated, skipped, latest, coveredBlocks: latest + 1 - coveredDownTo };
}

/** One account's public legs. */
export async function fetchPublicFootprint(
  address: string,
  options?: { maxLookbackBlocks?: number },
): Promise<{ entries: FootprintEntry[]; truncated: boolean; skipped: number }> {
  // One deterministic felt spelling - key matching is by value, but never
  // hand the node an ambiguous padding.
  const filterAddress = "0x" + BigInt(address).toString(16);
  const scan = await scanPoolEvents({
    // Position 0: either event selector. Position 1: our address - the
    // depositor on Deposit, the public recipient on Withdrawal.
    keys: [[DEPOSIT_SELECTOR, WITHDRAWAL_SELECTOR], [filterAddress]],
    maxLookbackBlocks: options?.maxLookbackBlocks,
    maxRpcCalls: MAX_RPC_CALLS,
  });
  return { entries: scan.entries, truncated: scan.truncated, skipped: scan.skipped };
}

let activityCache: { at: number; lookback: number; promise: Promise<EventScan> } | null = null;

/**
 * Every account's public legs over a bounded recent window - the crowd a
 * withdrawal hides in, and the deposits an observer would try to pair it
 * with. Public data; no wallet involvement. Cached briefly and shared, since
 * the dashboard and the pre-send check both want it at once.
 */
export function fetchPoolActivity(options?: {
  maxLookbackBlocks?: number;
}): Promise<EventScan> {
  const lookback = options?.maxLookbackBlocks ?? ACTIVITY_LOOKBACK_BLOCKS;
  const now = Date.now();
  if (
    activityCache &&
    activityCache.lookback === lookback &&
    now - activityCache.at < ACTIVITY_CACHE_MS
  ) {
    return activityCache.promise;
  }
  const promise = scanPoolEvents({
    keys: [[DEPOSIT_SELECTOR, WITHDRAWAL_SELECTOR]],
    maxLookbackBlocks: lookback,
    maxRpcCalls: ACTIVITY_MAX_RPC_CALLS,
    subRangeBlocks: ACTIVITY_SUB_RANGE_BLOCKS,
  });
  activityCache = { at: now, lookback, promise };
  // A failed scan must not be served from cache for 30 seconds.
  promise.catch(() => {
    if (activityCache?.promise === promise) activityCache = null;
  });
  return promise;
}
