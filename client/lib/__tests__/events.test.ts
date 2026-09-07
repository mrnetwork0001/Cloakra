import { beforeEach, describe, expect, it, vi } from "vitest";
import { hash } from "starknet";

const mockProvider = { getBlockNumber: vi.fn(), getEvents: vi.fn() };
vi.mock("@/lib/pool", () => ({ getProvider: () => mockProvider }));

import { ACTIVITY_LOOKBACK_BLOCKS, fetchPoolActivity, fetchPublicFootprint, parseFootprintEvent } from "@/lib/events";

const DEPOSIT = hash.getSelectorFromName("Deposit");
const WITHDRAWAL = hash.getSelectorFromName("Withdrawal");
const USER = "0x" + "1".repeat(60);
const TOKEN = "0x" + "2".repeat(60);
const TX = "0x" + "f".repeat(60);

describe("parseFootprintEvent", () => {
  it("parses a Deposit: data=[amount]", () => {
    const e = parseFootprintEvent({
      keys: [DEPOSIT, USER, TOKEN],
      data: ["0x1a"],
      transaction_hash: TX,
      block_number: 123,
    });
    expect(e).toEqual({
      kind: "deposit",
      account: USER,
      token: TOKEN,
      amount: 26n,
      txHash: TX,
      blockNumber: 123,
    });
  });

  it("parses a Withdrawal: amount is data[3] after the 3-felt EncUserAddr", () => {
    const e = parseFootprintEvent({
      keys: [WITHDRAWAL, USER, TOKEN],
      data: ["0x1", "0x2", "0x3", "0x2"],
      transaction_hash: TX,
    });
    expect(e?.kind).toBe("withdrawal");
    expect(e?.amount).toBe(2n);
    expect(e?.blockNumber).toBeNull();
  });

  it("returns null on layout drift instead of misreading amounts", () => {
    // Deposit with an appended field (e.g. a future fee column) must NOT
    // report the wrong felt as the amount.
    expect(
      parseFootprintEvent({
        keys: [DEPOSIT, USER, TOKEN],
        data: ["0x1a", "0x6"],
        transaction_hash: TX,
      }),
    ).toBeNull();
    expect(
      parseFootprintEvent({
        keys: [WITHDRAWAL, USER, TOKEN],
        data: ["0x1", "0x2", "0x3"],
        transaction_hash: TX,
      }),
    ).toBeNull();
  });

  it("normalizes the account key so padded spellings compare equal", () => {
    const e = parseFootprintEvent({
      keys: [WITHDRAWAL, "0x000" + USER.slice(2), TOKEN],
      data: ["0x1", "0x2", "0x3", "0x9"],
      transaction_hash: TX,
    });
    expect(e?.account).toBe(USER);
  });

  it("returns null when the key layout is short or unreadable", () => {
    expect(
      parseFootprintEvent({ keys: [DEPOSIT, USER], data: ["0x1"], transaction_hash: TX }),
    ).toBeNull();
    expect(
      parseFootprintEvent({
        keys: [DEPOSIT, "not-a-felt", TOKEN],
        data: ["0x1"],
        transaction_hash: TX,
      }),
    ).toBeNull();
  });

  it("never throws - unreadable felts, empty keys, and unknown selectors all yield null", () => {
    expect(
      parseFootprintEvent({ keys: [DEPOSIT, USER, TOKEN], data: ["nope"], transaction_hash: TX }),
    ).toBeNull();
    expect(parseFootprintEvent({ keys: [], data: [], transaction_hash: TX })).toBeNull();
    expect(
      parseFootprintEvent({
        keys: [hash.getSelectorFromName("Transfer"), USER, TOKEN],
        data: ["0x1", "0x2", "0x3", "0x4"],
        transaction_hash: TX,
      }),
    ).toBeNull();
  });

  it("selector matching is by felt value, not string spelling", () => {
    const padded = "0x0" + DEPOSIT.slice(2);
    const e = parseFootprintEvent({
      keys: [padded, USER, TOKEN],
      data: ["0x5"],
      transaction_hash: TX,
    });
    expect(e?.kind).toBe("deposit");
  });
});

const LATEST = 15_700_000;
const ev = (block: number, amount = "0x5") => ({
  keys: [DEPOSIT, USER, TOKEN],
  data: [amount],
  transaction_hash: TX,
  block_number: block,
});

describe("scanPoolEvents (through fetchPoolActivity / fetchPublicFootprint)", () => {
  beforeEach(() => {
    mockProvider.getBlockNumber.mockReset();
    mockProvider.getEvents.mockReset();
    mockProvider.getBlockNumber.mockResolvedValue(LATEST);
  });

  it("a 40,000-block window is exactly 40,000 blocks and tiles into 8 slices - NOT truncated", async () => {
    mockProvider.getEvents.mockResolvedValue({ events: [], continuation_token: undefined });
    const scan = await fetchPoolActivity({ maxLookbackBlocks: ACTIVITY_LOOKBACK_BLOCKS });
    expect(scan.truncated).toBe(false);
    expect(scan.coveredBlocks).toBe(ACTIVITY_LOOKBACK_BLOCKS);
    expect(mockProvider.getEvents).toHaveBeenCalledTimes(8);
    const first = mockProvider.getEvents.mock.calls[0][0];
    const last = mockProvider.getEvents.mock.calls[7][0];
    expect(first.to_block).toEqual({ block_number: LATEST });
    expect(first.from_block).toEqual({ block_number: LATEST - 4_999 });
    expect(last.from_block).toEqual({ block_number: LATEST - ACTIVITY_LOOKBACK_BLOCKS + 1 });
  });

  it("survives continuation tokens within the budget", async () => {
    let n = 0;
    mockProvider.getEvents.mockImplementation(async (q: { continuation_token?: string; from_block: { block_number: number } }) => {
      n++;
      // every slice answers one empty page with a token, then a real page
      if (!q.continuation_token) return { events: [], continuation_token: "more" };
      return { events: [ev(q.from_block.block_number)], continuation_token: undefined };
    });
    const scan = await fetchPoolActivity({ maxLookbackBlocks: 39_000 }); // distinct cache key
    expect(scan.truncated).toBe(false);
    expect(scan.entries).toHaveLength(8);
    expect(n).toBe(16);
  });

  it("a slice cut short by the budget is discarded whole, so the loss is the OLDEST slices", async () => {
    // Each slice needs 3 calls; budget 16 -> 5 complete slices (15 calls), the
    // 6th is cut after its first call.
    mockProvider.getEvents.mockImplementation(async (q: { continuation_token?: string; from_block: { block_number: number } }) => {
      if (!q.continuation_token) return { events: [ev(q.from_block.block_number + 1)], continuation_token: "a" };
      if (q.continuation_token === "a") return { events: [ev(q.from_block.block_number + 2)], continuation_token: "b" };
      return { events: [ev(q.from_block.block_number + 3)], continuation_token: undefined };
    });
    const scan = await fetchPoolActivity({ maxLookbackBlocks: 38_000 });
    expect(scan.truncated).toBe(true);
    expect(scan.coveredBlocks).toBe(5 * 5_000);
    expect(scan.entries).toHaveLength(15);
    // newest first, and nothing older than the covered span
    const oldest = Math.min(...scan.entries.map((e) => e.blockNumber ?? 0));
    expect(oldest).toBeGreaterThanOrEqual(LATEST - 5 * 5_000 + 1);
    expect(scan.entries[0].blockNumber).toBeGreaterThan(scan.entries[14].blockNumber ?? 0);
  });

  it("budget exhausted inside the first slice returns nothing, truncated, zero covered", async () => {
    mockProvider.getEvents.mockResolvedValue({ events: [ev(LATEST)], continuation_token: "forever" });
    const scan = await fetchPoolActivity({ maxLookbackBlocks: 37_000 });
    expect(scan).toMatchObject({ truncated: true, coveredBlocks: 0, entries: [] });
  });

  it("per-account footprint keeps its keys and single wide range", async () => {
    mockProvider.getEvents.mockResolvedValue({ events: [ev(LATEST - 10)], continuation_token: undefined });
    const out = await fetchPublicFootprint("0x0" + USER.slice(2), { maxLookbackBlocks: 40_000 });
    expect(out.truncated).toBe(false);
    expect(out.entries).toHaveLength(1);
    expect(mockProvider.getEvents).toHaveBeenCalledTimes(1);
    const q = mockProvider.getEvents.mock.calls[0][0];
    expect(q.keys[1]).toEqual([USER]); // normalized, unpadded
    expect(q.keys[0]).toHaveLength(2);
  });
});
