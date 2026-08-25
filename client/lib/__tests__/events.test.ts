import { describe, expect, it } from "vitest";
import { hash } from "starknet";
import { parseFootprintEvent } from "@/lib/events";

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
