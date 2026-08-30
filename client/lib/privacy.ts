/**
 * Pre-send privacy honesty checks. The pool hides recipients and amounts -
 * but timing and amount correlation against PUBLIC legs can re-link them,
 * and the classic mistakes are mechanical. These checks read only the payer's
 * own public footprint (data anyone can see) and warn before the wallet ever
 * opens. They never block - they make the trade-off a choice.
 *
 * Matching is deliberately APPROXIMATE (±1% with a floor): a real observer
 * is not defeated by dust-edits, so neither is this check. The check is
 * bounded and says so in the UI: it is not a complete privacy analysis.
 */

import { fetchPublicFootprint, type FootprintEntry } from "./events";
import { getPoolFeeCached, getProvider } from "./pool";
import { formatTokenAmount } from "./strk20";

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

const approxMinutes = (blocks: number) =>
  Math.max(1, Math.round((blocks * 1.7) / 60));

/** ±1% band with a 0.01 STRK floor - observers match approximately; so do we. */
export function closeTo(a: bigint, b: bigint): boolean {
  if (b <= 0n) return false;
  const diff = a > b ? a - b : b - a;
  const floor = 10n ** 16n; // 0.01 STRK
  const tol = b / 100n > floor ? b / 100n : floor;
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

  // Aggregate duplicates into one line with a count.
  const counts = new Map<string, { warning: PrivacyWarning; n: number }>();
  for (const w of raw) {
    const existing = counts.get(w.message);
    if (existing) existing.n++;
    else counts.set(w.message, { warning: w, n: 1 });
  }
  const out = [...counts.values()].map(({ warning, n }) =>
    n > 1 ? { ...warning, message: `${warning.message} (×${n})` } : warning,
  );
  if (toSelf && out.length > 0) {
    out.push({
      severity: "medium",
      message:
        "This unshield goes to your own address - the correlations above reveal your own round-trip, not a counterparty.",
    });
  }
  return out;
}

/** Chain-backed assessment. Degraded inputs surface as warnings - a check
 * that silently skipped its own coverage would be a false clean bill. */
export async function assessPrivacy(
  address: string,
  amounts: bigint[],
  kind: "transfer" | "withdraw",
  options?: { toSelf?: boolean },
): Promise<PrivacyWarning[]> {
  const [footprint, currentBlock, poolFee] = await Promise.all([
    fetchPublicFootprint(address, { maxLookbackBlocks: CHECK_LOOKBACK_BLOCKS }),
    getProvider().getBlockNumber(),
    getPoolFeeCached().catch(() => null),
  ]);
  const warnings = findCorrelations({
    entries: footprint.entries,
    currentBlock,
    amounts,
    poolFee,
    kind,
    toSelf: options?.toSelf,
  });
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
