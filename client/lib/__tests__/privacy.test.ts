import { describe, expect, it } from "vitest";
import { closeTo, findCorrelations } from "@/lib/privacy";
import type { FootprintEntry } from "@/lib/events";

const STRK = 10n ** 18n;
const TOKEN = "0x" + "2".repeat(60);

let txSeq = 0;
const dep = (amount: bigint, block: number | null): FootprintEntry => ({
  kind: "deposit",
  token: TOKEN,
  amount,
  txHash: "0x" + (++txSeq).toString(16).padStart(60, "0"),
  blockNumber: block,
});
const wdr = (amount: bigint, block: number): FootprintEntry => ({
  kind: "withdrawal",
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

describe("findCorrelations — timing", () => {
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

describe("findCorrelations — amount echoes", () => {
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

describe("findCorrelations — self-unshield softening", () => {
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

describe("findCorrelations — non-signals", () => {
  it("ignores withdrawals for both timing and echoes", () => {
    const ws = findCorrelations({
      ...base,
      entries: [wdr(100n * STRK, 99_999)],
      amounts: [100n * STRK],
    });
    expect(ws).toEqual([]);
  });
});
