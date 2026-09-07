/**
 * Pre-send privacy honesty checks. The pool hides recipients and amounts -
 * but timing and amount correlation against PUBLIC legs can re-link them,
 * and the classic mistakes are mechanical. These checks read only public
 * data (the pool's own events) and warn before the wallet ever opens. They
 * never block - they make the trade-off a choice.
 *
 * Two lenses:
 *   - Payer side (`findCorrelations`): the sender's OWN public deposits. A
 *     private transfer or unshield that echoes one re-links the org's leg.
 *   - Recipient side (`findUnshieldCorrelations`): OTHER accounts' public
 *     deposits, the pool's current crowd, and the withdrawer's own cadence.
 *     A recipient who unshields their exact row re-links the run from the
 *     other end - the failure our own docs admit the payer check cannot see.
 *
 * Matching is deliberately APPROXIMATE (±1% with a floor): a real observer
 * is not defeated by dust-edits, so neither is this check. The check is
 * bounded and says so in the UI: it is not a complete privacy analysis.
 */

import {
  ACTIVITY_LOOKBACK_BLOCKS,
  fetchPoolActivity,
  fetchPublicFootprint,
  type FootprintEntry,
} from "./events";
import { getPoolFeeCached, getProvider } from "./pool";
import { STRK_TOKEN_ADDRESS } from "./config";
import { formatTokenAmount, sameFelt } from "./strk20";

/** The checks and the crowd figure are about STRK. The pool carries other
 * tokens too, and `token` is a public key on both events - an ETH deposit
 * must never read as an echo of a STRK withdrawal, nor pad the crowd. */
const strkOnly = (entries: FootprintEntry[]): FootprintEntry[] =>
  entries.filter((e) => {
    try {
      return sameFelt(e.token, STRK_TOKEN_ADDRESS);
    } catch {
      return false;
    }
  });

const hoursOf = (blocks: number) => Math.max(1, Math.round((blocks * 1.7) / 3600));

export interface PrivacyWarning {
  severity: "high" | "medium";
  message: string;
}

/** Starknet blocks measured live at ~1.7s (200-block sample, 2026-08-25).
 * 2100 blocks ≈ one hour. */
const RECENT_BLOCKS = 2_100;
/** ≈19 hours of lookback at the measured rate - bounded for speed. */
const CHECK_LOOKBACK_BLOCKS = 40_000;
/** How many recent deposits the echo checks consider. */
const MAX_DEPOSITS_CHECKED = 30;
const MAX_FEE_MULTIPLES = 10;

/** Recipient-side bounds. Pool-wide there are more deposits and more
 * divisors, so each is capped to keep the false-positive rate honest: only
 * the deposit itself and the deposit net of ONE fee (the k-multiple fan-out
 * is a payer-side batch tell, not a recipient echo), and equal shares are
 * matched in a TIGHT band because a split divides a deposit exactly. */
const MAX_POOL_DEPOSITS_CHECKED = 200;
const MAX_SHARE_WAYS = 8;
const MAX_POOL_FEE_MULTIPLES = 1n;
const MAX_SHARE_FEE_MULTIPLES = 1;
const MAX_ECHO_LINES = 4;
/** Fewer withdrawals than this across the whole pool in the window means the
 * crowd is thin enough to say so. */
export const QUIET_POOL_WITHDRAWALS = 10;

const approxMinutes = (blocks: number) =>
  Math.max(1, Math.round((blocks * 1.7) / 60));

const approxAge = (blocks: number): string => {
  const min = approxMinutes(blocks);
  if (min < 90) return `~${min} min ago`;
  return `~${Math.round(min / 60)} h ago`;
};

/** ±1% band with a 0.01 STRK floor - observers match approximately; so do
 * we. The floor never exceeds 10% of the target, so a dust withdrawal cannot
 * "match" every small deposit. */
export function closeTo(a: bigint, b: bigint): boolean {
  if (b <= 0n) return false;
  const diff = a > b ? a - b : b - a;
  const floor = 10n ** 16n; // 0.01 STRK
  const cappedFloor = floor < b / 10n ? floor : b / 10n;
  const tol = b / 100n > cappedFloor ? b / 100n : cappedFloor;
  return diff <= tol;
}

/** ±0.2% band with a 0.001 STRK floor: a split divides a deposit exactly,
 * so a share match is held to a much tighter tolerance than an echo. */
export function closeToTight(a: bigint, b: bigint): boolean {
  if (b <= 0n) return false;
  const diff = a > b ? a - b : b - a;
  const floor = 10n ** 15n; // 0.001 STRK
  const cappedFloor = floor < b / 10n ? floor : b / 10n;
  const tol = b / 500n > cappedFloor ? b / 500n : cappedFloor;
  return diff <= tol;
}

/** Pure core - testable without a chain. Entries are newest-first. */
export function findCorrelations(opts: {
  entries: FootprintEntry[];
  currentBlock: number;
  amounts: bigint[];
  poolFee: bigint | null;
  kind: "transfer" | "withdraw";
  /** Unshield to the payer's own address: linkage reveals a round-trip, not
   * a counterparty - same facts, lower stakes. */
  toSelf?: boolean;
}): PrivacyWarning[] {
  const { entries, currentBlock, amounts, poolFee, kind, toSelf } = opts;
  const severity: PrivacyWarning["severity"] = toSelf ? "medium" : "high";
  const raw: PrivacyWarning[] = [];

  const deposits = entries.filter((e) => e.kind === "deposit");

  // Timing. A pre-confirmed deposit (null block, sorted newest) is by
  // definition seconds old - the moment of MAXIMAL correlation, never skipped.
  const newest = deposits[0];
  if (newest) {
    if (newest.blockNumber === null) {
      raw.push({
        severity,
        message: `You have a deposit still awaiting its block - this is the moment of maximal timing correlation for a private ${kind}.`,
      });
    } else {
      const delta = Math.max(0, currentBlock - newest.blockNumber);
      if (delta <= RECENT_BLOCKS) {
        raw.push({
          severity,
          message: `Your last public deposit was ~${delta} blocks (≈${approxMinutes(delta)} min) ago. A private ${kind} now is cheaply timing-correlatable with it - waiting longer deepens the crowd it hides in.`,
        });
      }
    }
  }

  // Amount echoes - approximate, fee-multiple-aware, and pairwise sums.
  const recent = deposits.slice(0, MAX_DEPOSITS_CHECKED);
  for (const amount of amounts) {
    for (const d of recent) {
      if (closeTo(amount, d.amount)) {
        raw.push({
          severity,
          message: `${formatTokenAmount(amount)} STRK closely matches your public deposit of ${formatTokenAmount(d.amount)} STRK - observers pair legs by approximate amount, not exact digits.`,
        });
        continue;
      }
      if (poolFee !== null && poolFee > 0n) {
        for (let k = 1n; k <= MAX_FEE_MULTIPLES; k++) {
          const target = d.amount - k * poolFee;
          if (target <= 0n) break;
          if (closeTo(amount, target)) {
            raw.push({
              severity,
              message:
                k === 1n
                  ? `${formatTokenAmount(amount)} STRK ≈ your public deposit of ${formatTokenAmount(d.amount)} STRK minus the pool fee - the classic net-of-fee tell.`
                  : `${formatTokenAmount(amount)} STRK ≈ your public deposit of ${formatTokenAmount(d.amount)} STRK minus ${k}× the pool fee - a batch-shaped tell.`,
            });
            break;
          }
        }
      }
    }
    // Sum-of-two-deposits echo: an observer can add two public rows.
    const pairPool = recent.slice(0, 20);
    outer: for (let i = 0; i < pairPool.length; i++) {
      for (let j = i + 1; j < pairPool.length; j++) {
        if (closeTo(amount, pairPool[i].amount + pairPool[j].amount)) {
          raw.push({
            severity,
            message: `${formatTokenAmount(amount)} STRK ≈ the sum of two of your public deposits (${formatTokenAmount(pairPool[i].amount)} + ${formatTokenAmount(pairPool[j].amount)}) - observers add rows too.`,
          });
          break outer;
        }
      }
    }
  }

  const out = aggregate(raw);
  if (toSelf && out.length > 0) {
    out.push({
      severity: "medium",
      message:
        "This unshield goes to your own address - the correlations above reveal your own round-trip, not a counterparty.",
    });
  }
  return out;
}

/** Aggregate duplicates into one line with a count. */
function aggregate(raw: PrivacyWarning[]): PrivacyWarning[] {
  const counts = new Map<string, { warning: PrivacyWarning; n: number }>();
  for (const w of raw) {
    const existing = counts.get(w.message);
    if (existing) existing.n++;
    else counts.set(w.message, { warning: w, n: 1 });
  }
  return [...counts.values()].map(({ warning, n }) =>
    n > 1 ? { ...warning, message: `${warning.message} (×${n})` } : warning,
  );
}

export interface PoolCrowd {
  deposits: number;
  withdrawals: number;
  lookbackBlocks: number;
  /** Blocks actually covered, newest first - shorter than the lookback when
   * the scan was truncated. Counts are complete over this span. */
  coveredBlocks: number;
  /** The window's oldest part is missing - the span is `coveredBlocks`. */
  truncated: boolean;
}

/** Pure: how busy the pool was over a scan window (STRK legs only). */
export function summarizePoolActivity(
  entries: FootprintEntry[],
  lookbackBlocks: number,
  truncated: boolean,
  coveredBlocks = lookbackBlocks,
): PoolCrowd {
  let deposits = 0;
  let withdrawals = 0;
  for (const e of strkOnly(entries)) {
    if (e.kind === "deposit") deposits++;
    else withdrawals++;
  }
  return { deposits, withdrawals, lookbackBlocks, coveredBlocks, truncated };
}

/**
 * Recipient-side core - pure and testable. `poolEntries` are every account's
 * public legs (newest first); `ownEntries` are the withdrawer's own. Only the
 * amount about to be unshielded is examined; the shielded balance is never
 * read here.
 */
export function findUnshieldCorrelations(opts: {
  poolEntries: FootprintEntry[];
  ownEntries: FootprintEntry[];
  selfAddress: string;
  currentBlock: number;
  amount: bigint;
  poolFee: bigint | null;
  poolTruncated: boolean;
  /** Blocks the pool scan covers; only the copy depends on it. */
  coveredBlocks?: number;
  /** The public address receiving the withdrawal - the cadence an observer
   * sees is at the recipient, which need not be the signing wallet. */
  recipient?: string;
}): PrivacyWarning[] {
  const { poolEntries, ownEntries, selfAddress, currentBlock, amount, poolFee, poolTruncated } =
    opts;
  const windowHours = hoursOf(opts.coveredBlocks ?? ACTIVITY_LOOKBACK_BLOCKS);
  const out: PrivacyWarning[] = [];
  const fmt = formatTokenAmount;

  // Other accounts' deposits only - the withdrawer's own are the payer
  // lens's job, and double-reporting them would drown the new signal.
  // A deposit of at most one fee (Ready's 6 STRK registration is exactly
  // that) leaves nothing shielded, so it cannot echo or split into any
  // withdrawal - skip it rather than raise a false alarm.
  const feeFloor = poolFee !== null && poolFee > 0n ? poolFee : 0n;
  const others = poolEntries
    .filter(
      (e) =>
        e.kind === "deposit" && e.amount > feeFloor && !sameFelt(e.account, selfAddress),
    )
    .slice(0, MAX_POOL_DEPOSITS_CHECKED);

  const ageOf = (e: FootprintEntry) =>
    e.blockNumber === null ? 0 : Math.max(0, currentBlock - e.blockNumber);
  const isRecent = (e: FootprintEntry) => ageOf(e) <= RECENT_BLOCKS;

  type Echo = { deposit: FootprintEntry; how: string };
  const direct: Echo[] = [];
  const shares: { deposit: FootprintEntry; n: number; k: number }[] = [];

  for (const d of others) {
    if (closeTo(amount, d.amount)) {
      direct.push({ deposit: d, how: "" });
      continue;
    }
    let matched = false;
    if (poolFee !== null && poolFee > 0n) {
      for (let k = 1n; k <= MAX_POOL_FEE_MULTIPLES; k++) {
        const target = d.amount - k * poolFee;
        if (target <= 0n) break;
        if (closeTo(amount, target)) {
          direct.push({
            deposit: d,
            how: k === 1n ? " minus the pool fee" : ` minus ${k}× the pool fee`,
          });
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;
    // Equal-share tell: 1/n of a deposit net of a few fees. The most specific
    // (smallest n) match wins so one deposit yields one line.
    const feeSteps = poolFee !== null && poolFee > 0n ? MAX_SHARE_FEE_MULTIPLES : 0;
    share: for (let n = 2n; n <= BigInt(MAX_SHARE_WAYS); n++) {
      for (let k = 0n; k <= BigInt(feeSteps); k++) {
        const net = d.amount - k * (poolFee ?? 0n);
        if (net <= 0n) break;
        if (closeToTight(amount, net / n)) {
          shares.push({ deposit: d, n: Number(n), k: Number(k) });
          break share;
        }
      }
    }
  }

  // Direct echoes: one line each, capped, recency drives severity.
  const shown = direct.slice(0, MAX_ECHO_LINES);
  for (const { deposit, how } of shown) {
    out.push({
      severity: isRecent(deposit) ? "high" : "medium",
      message: `${fmt(amount)} STRK ≈ a public deposit of ${fmt(deposit.amount)} STRK by another account ${approxAge(ageOf(deposit))}${how} - an observer pairing that deposit with this withdrawal needs nothing else.`,
    });
  }
  if (direct.length > shown.length) {
    out.push({
      severity: "medium",
      message: `${direct.length - shown.length} more public deposit${direct.length - shown.length === 1 ? "" : "s"} by other accounts in the last ~${windowHours} h also ≈ ${fmt(amount)} STRK.`,
    });
  }

  // Share matches: one aggregated line, led by the most specific match.
  if (shares.length > 0) {
    shares.sort((a, b) => a.n - b.n || ageOf(a.deposit) - ageOf(b.deposit));
    const lead = shares[0];
    const rest = shares.length - 1;
    const net = lead.k === 0 ? "" : lead.k === 1 ? ", net of one fee" : `, net of ${lead.k} fees`;
    out.push({
      severity: shares.some((sh) => isRecent(sh.deposit)) ? "high" : "medium",
      message: `${fmt(amount)} STRK ≈ an equal 1/${lead.n} share of a ${fmt(lead.deposit.amount)} STRK public deposit by another account ${approxAge(ageOf(lead.deposit))}${net}${rest > 0 ? ` (and ${rest} other split-shaped match${rest === 1 ? "" : "es"})` : ""} - recipients of a split who each unshield their exact row re-link the run from the other end.`,
    });
  }

  // Cadence: repeated equal withdrawals at the RECEIVING address read as a
  // payroll rhythm - and that address need not be the signing wallet, so
  // look it up in the pool-wide scan (own legs when unshielding to self).
  const target = opts.recipient ?? selfAddress;
  const cadenceSource = sameFelt(target, selfAddress) ? ownEntries : poolEntries;
  const priorSame = cadenceSource.filter(
    (e) => e.kind === "withdrawal" && sameFelt(e.account, target) && closeTo(amount, e.amount),
  ).length;
  if (priorSame > 0) {
    const who = sameFelt(target, selfAddress)
      ? `You have unshielded ≈ ${fmt(amount)} STRK before`
      : `This recipient has received ≈ ${fmt(amount)} STRK from the pool before`;
    out.push({
      severity: "medium",
      message: `${who} (×${priorSame}). Repeated equal withdrawals form a recognisable cadence - different sizes at irregular times break it; dust changes do not.`,
    });
  }

  // Crowd. Only when the window is complete - a floor is not a count.
  if (!poolTruncated) {
    const withdrawals = poolEntries.filter((e) => e.kind === "withdrawal").length;
    if (withdrawals < QUIET_POOL_WITHDRAWALS) {
      out.push({
        severity: "medium",
        message:
          withdrawals === 0
            ? `The pool is quiet - no STRK withdrawals by anyone in the last ~${windowHours} h. Yours would stand alone; a busier period gives it a crowd.`
            : `The pool is quiet - only ${withdrawals} STRK withdrawal${withdrawals === 1 ? "" : "s"} by anyone in the last ~${windowHours} h. Yours would be one of ${withdrawals + 1}; a busier period deepens the crowd.`,
      });
    }
  } else {
    out.push({
      severity: "medium",
      message:
        "The pool-wide scan was incomplete - other accounts' matching deposits may exist that this check did not see.",
    });
  }

  return aggregate(out);
}

/** Chain-backed assessment. Degraded inputs surface as warnings - a check
 * that silently skipped its own coverage would be a false clean bill. */
export async function assessPrivacy(
  address: string,
  amounts: bigint[],
  kind: "transfer" | "withdraw",
  options?: { toSelf?: boolean; recipient?: string },
): Promise<PrivacyWarning[]> {
  const wantsPool = kind === "withdraw";
  const [footprint, currentBlock, poolFee, pool] = await Promise.all([
    fetchPublicFootprint(address, { maxLookbackBlocks: CHECK_LOOKBACK_BLOCKS }),
    getProvider().getBlockNumber(),
    getPoolFeeCached().catch(() => null),
    wantsPool
      ? fetchPoolActivity({ maxLookbackBlocks: CHECK_LOOKBACK_BLOCKS }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const own = strkOnly(footprint.entries);
  const warnings = findCorrelations({
    entries: own,
    currentBlock,
    amounts,
    poolFee,
    kind,
    toSelf: options?.toSelf,
  });
  if (wantsPool) {
    if (pool === null) {
      warnings.push({
        severity: "medium",
        message:
          "The pool-wide check could not run (RPC) - other accounts' deposits and the pool's crowd were not examined.",
      });
    } else {
      for (const amount of amounts) {
        warnings.push(
          ...findUnshieldCorrelations({
            poolEntries: strkOnly(pool.entries),
            ownEntries: own,
            selfAddress: address,
            currentBlock,
            amount,
            poolFee,
            poolTruncated: pool.truncated,
            coveredBlocks: pool.coveredBlocks,
            recipient: options?.recipient,
          }),
        );
      }
    }
  }
  if (footprint.truncated || footprint.skipped > 0) {
    warnings.push({
      severity: "medium",
      message:
        "The footprint scan was incomplete - matching deposits may exist that this check did not see.",
    });
  }
  if (poolFee === null) {
    warnings.push({
      severity: "medium",
      message: "The pool fee could not be read - fee-offset echoes were not checked.",
    });
  }
  return warnings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}

/** Pool crowd for display - the same scan the unshield check uses. */
export async function fetchPoolCrowd(): Promise<PoolCrowd> {
  const scan = await fetchPoolActivity({ maxLookbackBlocks: ACTIVITY_LOOKBACK_BLOCKS });
  // A scan whose newest slice was cut by the budget read nothing - "0 · 0"
  // over zero blocks is not a count, so report it as unreadable.
  if (scan.coveredBlocks === 0) throw new Error("pool scan covered no blocks");
  return summarizePoolActivity(
    scan.entries,
    ACTIVITY_LOOKBACK_BLOCKS,
    scan.truncated,
    scan.coveredBlocks,
  );
}

/** Hours a crowd figure covers, for display. */
export function crowdHours(crowd: PoolCrowd): number {
  return hoursOf(crowd.coveredBlocks);
}
