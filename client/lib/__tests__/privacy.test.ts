import { describe, expect, it } from "vitest";
import {
  closeTo,
  closeToTight,
  findCorrelations,
  findUnshieldCorrelations,
  summarizePoolActivity,
  QUIET_POOL_WITHDRAWALS,
} from "@/lib/privacy";
import type { FootprintEntry } from "@/lib/events";

const STRK = 10n ** 18n;
const TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"; // STRK
const SELF = "0x" + "a".repeat(60);
const OTHER = "0x" + "b".repeat(60);

let txSeq = 0;
const dep = (amount: bigint, block: number | null, account = SELF): FootprintEntry => ({
  kind: "deposit",
  account,
  token: TOKEN,
  amount,
  txHash: "0x" + (++txSeq).toString(16).padStart(60, "0"),
  blockNumber: block,
});
const wdr = (amount: bigint, block: number, account = SELF): FootprintEntry => ({
  kind: "withdrawal",
  account,
  token: TOKEN,
  amount,
  txHash: "0x" + (++txSeq).toString(16).padStart(60, "0"),
  blockNumber: block,
});

const base = {
  currentBlock: 100_000,
  poolFee: 6n * STRK,
  kind: "transfer" as const,
};

describe("closeTo", () => {
  it("matches within 1% and the 0.01 STRK floor", () => {
    expect(closeTo(500n * STRK, 500n * STRK)).toBe(true);
    expect(closeTo(49999n * STRK / 100n, 500n * STRK)).toBe(true); // 499.99 vs 500
    expect(closeTo(495n * STRK, 500n * STRK)).toBe(true); // 1% band
    expect(closeTo(490n * STRK, 500n * STRK)).toBe(false);
    expect(closeTo(1n, 0n)).toBe(false);
  });
});

describe("closeTo floors", () => {
  it("the absolute floor never exceeds 10% of the target, so dust cannot match everything", () => {
    // target 0.02 STRK: 1% = 0.0002, floor 0.01 would swallow it; capped to 0.002
    const target = 2n * 10n ** 16n;
    expect(closeTo(target + 10n ** 15n, target)).toBe(true); // 0.021 vs 0.020
    expect(closeTo(target + 5n * 10n ** 15n, target)).toBe(false); // 0.025 vs 0.020
    expect(closeTo(5n * 10n ** 15n, 6n * STRK + 3n * 10n ** 16n)).toBe(false);
  });

  it("closeToTight holds shares to ±0.2%", () => {
    expect(closeToTight(4999n * STRK / 100n, 50n * STRK)).toBe(true); // 49.99
    expect(closeToTight(499n * STRK / 10n, 50n * STRK)).toBe(true); // 49.9 exactly on the band
    expect(closeToTight(497n * STRK / 10n, 50n * STRK)).toBe(false); // 49.7 (0.6%)
  });
});

describe("findCorrelations - timing", () => {
  it("warns on a recent confirmed deposit", () => {
    const ws = findCorrelations({
      ...base,
      entries: [dep(999n * STRK, 99_000)],
      amounts: [3n * STRK],
    });
    expect(ws.some((w) => /timing-correlatable/.test(w.message))).toBe(true);
  });

  it("treats a pre-confirmed deposit as maximal correlation, never skips it", () => {
    const ws = findCorrelations({
      ...base,
      entries: [dep(999n * STRK, null), dep(999n * STRK, 10)],
      amounts: [3n * STRK],
    });
    expect(ws.some((w) => /maximal timing correlation/.test(w.message))).toBe(true);
  });

  it("stays silent when the last deposit is old", () => {
    const ws = findCorrelations({
      ...base,
      entries: [dep(999n * STRK, 10)],
      amounts: [3n * STRK],
    });
    expect(ws).toEqual([]);
  });
});

describe("findCorrelations - amount echoes", () => {
  it("dust-changed amounts still warn (approximate matching)", () => {
    const ws = findCorrelations({
      ...base,
      entries: [dep(500n * STRK, 10)],
      amounts: [49999n * STRK / 100n], // 499.99
    });
    expect(ws.some((w) => /closely matches/.test(w.message))).toBe(true);
  });

  it("flags the net-of-fee tell and multi-fee batch shapes", () => {
    const one = findCorrelations({
      ...base,
      entries: [dep(26n * STRK, 10)],
      amounts: [20n * STRK],
    });
    expect(one.some((w) => /net-of-fee tell/.test(w.message))).toBe(true);

    const three = findCorrelations({
      ...base,
      entries: [dep(100n * STRK, 10)],
      amounts: [82n * STRK], // 100 - 3×6
    });
    expect(three.some((w) => /3× the pool fee/.test(w.message))).toBe(true);
  });

  it("flags an amount equal to the sum of two deposits", () => {
    const ws = findCorrelations({
      ...base,
      entries: [dep(60n * STRK, 10), dep(40n * STRK, 20)],
      amounts: [100n * STRK],
    });
    expect(ws.some((w) => /sum of two of your public deposits/.test(w.message))).toBe(true);
  });

  it("aggregates identical warnings with a count instead of spamming", () => {
    const ws = findCorrelations({
      ...base,
      entries: [dep(100n * STRK, 10), dep(100n * STRK, 20), dep(100n * STRK, 30)],
      amounts: [100n * STRK],
    });
    const echo = ws.filter((w) => /closely matches/.test(w.message));
    expect(echo).toHaveLength(1);
    expect(echo[0].message).toMatch(/×3/);
  });

  it("skips fee-offset checks when the fee is unknown", () => {
    const ws = findCorrelations({
      ...base,
      poolFee: null,
      entries: [dep(26n * STRK, 10)],
      amounts: [20n * STRK],
    });
    expect(ws).toEqual([]);
  });
});

describe("findCorrelations - self-unshield softening", () => {
  it("downgrades severity and explains the round-trip", () => {
    const ws = findCorrelations({
      ...base,
      kind: "withdraw",
      toSelf: true,
      entries: [dep(500n * STRK, 10)],
      amounts: [500n * STRK],
    });
    expect(ws.every((w) => w.severity === "medium")).toBe(true);
    expect(ws.some((w) => /round-trip/.test(w.message))).toBe(true);
  });
});

describe("findCorrelations - non-signals", () => {
  it("ignores withdrawals for both timing and echoes", () => {
    const ws = findCorrelations({
      ...base,
      entries: [wdr(100n * STRK, 99_999)],
      amounts: [100n * STRK],
    });
    expect(ws).toEqual([]);
  });
});

/** A pool with enough withdrawals to not be "quiet". */
const busyPool = (extra: FootprintEntry[] = []): FootprintEntry[] => [
  ...extra,
  ...Array.from({ length: QUIET_POOL_WITHDRAWALS }, (_, i) =>
    wdr(BigInt(1000 + i) * STRK, 50_000 - i, OTHER),
  ),
];

const recipientBase = {
  ownEntries: [] as FootprintEntry[],
  selfAddress: SELF,
  currentBlock: 100_000,
  poolFee: 6n * STRK,
  poolTruncated: false,
};

describe("summarizePoolActivity", () => {
  it("counts each kind and carries the window facts", () => {
    const s = summarizePoolActivity([dep(1n, 1), dep(2n, 2), wdr(3n, 3)], 40_000, true, 12_000);
    expect(s).toEqual({
      deposits: 2,
      withdrawals: 1,
      lookbackBlocks: 40_000,
      coveredBlocks: 12_000,
      truncated: true,
    });
  });

  it("counts STRK legs only - other tokens are not a crowd for a STRK withdrawal", () => {
    const eth = { ...wdr(3n, 3), token: "0x" + "e".repeat(60) };
    const s = summarizePoolActivity([wdr(1n, 1), eth], 40_000, false);
    expect(s.withdrawals).toBe(1);
    expect(s.coveredBlocks).toBe(40_000);
  });
});

describe("findUnshieldCorrelations - other accounts' deposits", () => {
  it("is silent when nothing matches and the pool is busy", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(500n * STRK, 99_000, OTHER)]),
      amount: 20n * STRK,
    });
    expect(ws).toEqual([]);
  });

  it("flags a direct echo of another account's deposit, high when recent", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(20n * STRK, 99_500, OTHER)]),
      amount: 20n * STRK,
    });
    const echo = ws.find((w) => /by another account/.test(w.message));
    expect(echo?.severity).toBe("high");
    expect(echo?.message).toMatch(/needs nothing else/);
  });

  it("downgrades an old echo to medium", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(20n * STRK, 60_000, OTHER)]),
      amount: 20n * STRK,
    });
    const echo = ws.find((w) => /by another account/.test(w.message));
    expect(echo?.severity).toBe("medium");
    expect(echo?.message).toMatch(/h ago/);
  });

  it("flags the net-of-fee shape against another account's deposit", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(26n * STRK, 99_500, OTHER)]),
      amount: 20n * STRK,
    });
    expect(ws.some((w) => /minus the pool fee/.test(w.message))).toBe(true);
  });

  it("flags an equal-share of a split-shaped deposit, most specific share first", () => {
    // 106 in, 100 net of one fee, four equal shares of 25.
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(106n * STRK, 90_000, OTHER)]),
      amount: 25n * STRK,
    });
    const share = ws.find((w) => /equal 1\/4 share/.test(w.message));
    expect(share).toBeDefined();
    expect(share?.message).toMatch(/net of one fee/);
    expect(share?.message).toMatch(/re-link the run/);
  });

  it("dust-edited share amounts still match (approximate)", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(100n * STRK, 90_000, OTHER)]),
      amount: 4999n * STRK / 100n, // 49.99 ≈ 100/2
    });
    expect(ws.some((w) => /equal 1\/2 share/.test(w.message))).toBe(true);
  });

  it("ignores the withdrawer's OWN deposits - the payer lens covers those", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(20n * STRK, 99_500, SELF)]),
      amount: 20n * STRK,
    });
    expect(ws.some((w) => /by another account/.test(w.message))).toBe(false);
  });

  it("matches own-account spelling by felt value, not string", () => {
    const padded = "0x000" + SELF.slice(2);
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      selfAddress: padded,
      poolEntries: busyPool([dep(20n * STRK, 99_500, SELF)]),
      amount: 20n * STRK,
    });
    expect(ws.some((w) => /by another account/.test(w.message))).toBe(false);
  });

  it("caps direct echo lines and summarizes the rest", () => {
    const many = Array.from({ length: 7 }, (_, i) => dep(20n * STRK, 99_000 - i, OTHER));
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool(many),
      amount: 20n * STRK,
    });
    // Identical messages aggregate with a count; the overflow gets one line.
    expect(ws.some((w) => /more public deposit/.test(w.message))).toBe(true);
    expect(ws.filter((w) => /by another account/.test(w.message)).length).toBeLessThanOrEqual(4);
  });

  it("net-of-one-fee share wording, overflow suffix, and severity from the lead deposit", () => {
    // 106 net of 1 fee = 100 -> 1/4 = 25 (recent); 206 net of 1 fee = 200 -> 1/8 = 25 (old).
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(106n * STRK, 99_500, OTHER), dep(206n * STRK, 80_000, OTHER)]),
      amount: 25n * STRK,
    });
    const share = ws.find((w) => /equal 1\/4 share/.test(w.message));
    expect(share?.severity).toBe("high");
    expect(share?.message).toMatch(/net of one fee/);
    expect(share?.message).toMatch(/and 1 other split-shaped match\)/);
    expect(ws.filter((w) => /equal 1\//.test(w.message))).toHaveLength(1);
  });

  it("a pre-confirmed deposit by another account is treated as seconds old (high)", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(20n * STRK, null, OTHER)]),
      amount: 20n * STRK,
    });
    const echo = ws.find((w) => /by another account/.test(w.message));
    expect(echo?.severity).toBe("high");
    expect(echo?.message).toMatch(/~1 min ago/);
  });

  it("with the fee unknown, exact shares (k = 0) are still checked", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolFee: null,
      poolEntries: busyPool([dep(100n * STRK, 90_000, OTHER)]),
      amount: 25n * STRK,
    });
    expect(ws.some((w) => /equal 1\/4 share/.test(w.message))).toBe(true);
    expect(ws.some((w) => /net of/.test(w.message))).toBe(false);
  });

  it("copy quotes the covered window, not the nominal one", () => {
    const many = Array.from({ length: 6 }, (_, i) => dep(20n * STRK, 99_000 - i, OTHER));
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool(many),
      amount: 20n * STRK,
      coveredBlocks: 10_000, // ~4.7 h
    });
    expect(ws.find((w) => /more public deposit/.test(w.message))?.message).toMatch(/last ~5 h/);
  });

  it("ignores deposits the fee consumes entirely - a registration is not a split", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(6n * STRK, 99_500, OTHER)]),
      amount: 3n * STRK,
    });
    expect(ws.some((w) => /share|by another account/.test(w.message))).toBe(false);
    const six = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(6n * STRK, 99_500, OTHER)]),
      amount: 6n * STRK,
    });
    expect(six.some((w) => /by another account/.test(w.message))).toBe(false);
  });

  it("only the deposit and deposit-minus-one-fee are echoes on the recipient side", () => {
    // 32 - 2 fees = 20: a payer-side batch tell, not a recipient echo.
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(32n * STRK, 99_500, OTHER)]),
      amount: 20n * STRK,
    });
    expect(ws.some((w) => /by another account/.test(w.message))).toBe(false);
  });

  it("a share is matched tightly - 1% off is not an equal share", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(100n * STRK, 90_000, OTHER)]),
      amount: 2475n * STRK / 100n, // 24.75 vs 25 (1% off)
    });
    expect(ws.some((w) => /equal 1\/4 share/.test(w.message))).toBe(false);
  });

  it("the share line is high when ANY matching deposit is recent, not only the smallest-n one", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool([dep(200n * STRK, 89_000, OTHER), dep(300n * STRK, 99_900, OTHER)]),
      amount: 100n * STRK,
    });
    const share = ws.find((w) => /equal 1\/2 share/.test(w.message));
    expect(share?.severity).toBe("high");
  });

  it("skips fee-shaped matches when the fee is unknown but still finds direct echoes", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolFee: null,
      poolEntries: busyPool([dep(26n * STRK, 99_500, OTHER), dep(20n * STRK, 99_400, OTHER)]),
      amount: 20n * STRK,
    });
    expect(ws.some((w) => /minus the pool fee/.test(w.message))).toBe(false);
    expect(ws.some((w) => /by another account/.test(w.message))).toBe(true);
  });
});

describe("findUnshieldCorrelations - cadence", () => {
  it("looks at the RECEIVING address in the pool scan when unshielding elsewhere", () => {
    const B = "0x" + "c".repeat(60);
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      recipient: B,
      poolEntries: busyPool([wdr(100n * STRK, 10, B), wdr(100n * STRK, 20, B), wdr(100n * STRK, 30, SELF)]),
      amount: 100n * STRK,
    });
    const cadence = ws.find((w) => /cadence/.test(w.message));
    expect(cadence?.message).toMatch(/This recipient has received/);
    expect(cadence?.message).toMatch(/×2/);
  });

  it("does not blame the recipient for the signer's own history", () => {
    const B = "0x" + "c".repeat(60);
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      recipient: B,
      ownEntries: [wdr(100n * STRK, 10), wdr(100n * STRK, 20)],
      poolEntries: busyPool(),
      amount: 100n * STRK,
    });
    expect(ws.some((w) => /cadence/.test(w.message))).toBe(false);
  });

  it("flags repeated equal withdrawals with a count", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      ownEntries: [wdr(20n * STRK, 10), wdr(2001n * STRK / 100n, 20), dep(20n * STRK, 30)],
      poolEntries: busyPool(),
      amount: 20n * STRK,
    });
    const cadence = ws.find((w) => /cadence/.test(w.message));
    expect(cadence?.severity).toBe("medium");
    expect(cadence?.message).toMatch(/×2/);
    expect(cadence?.message).toMatch(/dust changes do not/);
  });

  it("does not count own deposits as cadence", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      ownEntries: [dep(20n * STRK, 10)],
      poolEntries: busyPool(),
      amount: 20n * STRK,
    });
    expect(ws.some((w) => /cadence/.test(w.message))).toBe(false);
  });
});

describe("findUnshieldCorrelations - crowd", () => {
  it("warns when the pool is quiet, with the exact crowd size", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: [wdr(1n * STRK, 1, OTHER), wdr(2n * STRK, 2, OTHER)],
      amount: 20n * STRK,
    });
    const quiet = ws.find((w) => /pool is quiet/.test(w.message));
    expect(quiet?.severity).toBe("medium");
    expect(quiet?.message).toMatch(/only 2 STRK withdrawals/);
    expect(quiet?.message).toMatch(/one of 3/);
  });

  it("says so when nobody has withdrawn at all", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: [dep(500n * STRK, 1, OTHER)],
      amount: 20n * STRK,
    });
    expect(ws.some((w) => /no STRK withdrawals by anyone/.test(w.message))).toBe(true);
  });

  it("stays silent about the crowd once the threshold is met", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolEntries: busyPool(),
      amount: 20n * STRK,
    });
    expect(ws.some((w) => /pool is quiet/.test(w.message))).toBe(false);
  });

  it("never calls a truncated window quiet - it reports the gap instead", () => {
    const ws = findUnshieldCorrelations({
      ...recipientBase,
      poolTruncated: true,
      poolEntries: [],
      amount: 20n * STRK,
    });
    expect(ws.some((w) => /pool is quiet/.test(w.message))).toBe(false);
    expect(ws.some((w) => /pool-wide scan was incomplete/.test(w.message))).toBe(true);
  });
});
