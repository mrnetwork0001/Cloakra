import { describe, expect, it } from "vitest";
import {
  auditReceipts,
  auditReportCsv,
  parseReceiptBundle,
  runKey,
  type AuditCheckers,
} from "@/lib/audit";
import {
  checkReceiptMerkle,
  checkReceiptStructure,
  prepareRun,
  receiptOk,
  type PayoutReceipt,
} from "@/lib/receipts";
import { STRK20_POOL_ADDRESS } from "@/lib/config";

const ORG = "0x" + "a".repeat(60);
const TX = "0x" + "f".repeat(60);
const TX2 = "0x" + "e".repeat(60);
const STRK = 10n ** 18n;
const R = (i: number, strk: bigint) => ({
  address: "0x" + i.toString(16).repeat(60).slice(0, 60),
  raw: strk * STRK,
});

/** Build a run's receipts the way signRun does, with a stand-in signature. */
function receiptsFor(
  operation: string,
  txHash: string,
  recipients: { address: string; raw: bigint }[],
  signature = ["0x1", "0x2"],
): PayoutReceipt[] {
  const run = prepareRun(operation, txHash, ORG, recipients);
  return run.leaves.map(({ recipient, salt, leaf }) => ({
    format: "cloakra-receipt-v1" as const,
    operation,
    chainId: "0x534e5f4d41494e",
    txHash,
    pool: STRK20_POOL_ADDRESS,
    org: ORG,
    recipientCount: recipients.length,
    merkleRoot: run.merkleRoot,
    recipient: recipient.address,
    amount: "0x" + recipient.raw.toString(16),
    amountDisplay: "ignored",
    salt,
    proof: run.tree.getProof(leaf),
    signature,
    note: "",
  }));
}

const load = (rs: unknown[], prefix = "file") =>
  rs.map((receipt, i) => ({ source: `${prefix}-${i + 1}.json`, receipt }));

const allGood: AuditCheckers = {
  signature: async () => true,
  settlement: async () => "SUCCEEDED_POOL",
};

describe("checkReceiptStructure", () => {
  it("accepts a receipt built the way signRun builds them", () => {
    const [r] = receiptsFor("StealthSplit", TX, [R(1, 5n)]);
    expect(checkReceiptStructure(r)).toBe(true);
    expect(checkReceiptMerkle(r)).toBe(true);
  });

  it("rejects the wrong chain or pool - decorative fields are not allowed", () => {
    const [r] = receiptsFor("StealthSplit", TX, [R(1, 5n)]);
    expect(checkReceiptStructure({ ...r, chainId: "0x534e5f5345504f4c4941" })).toBe(false);
    expect(checkReceiptStructure({ ...r, pool: "0x1" })).toBe(false);
  });

  it("treats a malformed proof or signature as a structure failure, not inconclusive", () => {
    const [r] = receiptsFor("StealthSplit", TX, [R(1, 5n)]);
    expect(checkReceiptStructure({ ...r, proof: ["0x1", "nope"] })).toBe(false);
    expect(checkReceiptStructure({ ...r, proof: "0x1" })).toBe(false);
    expect(checkReceiptStructure({ ...r, signature: [] })).toBe(false);
    expect(checkReceiptStructure({ ...r, signature: "0x1,0x2" })).toBe(false);
    expect(checkReceiptStructure({ ...r, recipientCount: 0 })).toBe(false);
    expect(checkReceiptStructure({ ...r, recipientCount: "3" })).toBe(false);
    expect(checkReceiptStructure(null)).toBe(false);
    expect(checkReceiptStructure("{}")).toBe(false);
  });
});

describe("receiptOk", () => {
  it("requires every check, and null is never a pass", () => {
    const base = { structure: true, merkle: true, signature: true as boolean | null, transaction: "SUCCEEDED_POOL" as const };
    expect(receiptOk(base)).toBe(true);
    expect(receiptOk({ ...base, signature: null })).toBe(false);
    expect(receiptOk({ ...base, transaction: "SUCCEEDED_NOT_POOL" })).toBe(false);
    expect(receiptOk({ ...base, merkle: false })).toBe(false);
  });
});

describe("parseReceiptBundle", () => {
  it("accepts one receipt, a list, and NDJSON", () => {
    expect(parseReceiptBundle('{"a":1}', "x").receipts).toHaveLength(1);
    const list = parseReceiptBundle('[{"a":1},{"b":2}]', "x");
    expect(list.receipts.map((r) => r.source)).toEqual(["x [1]", "x [2]"]);
    const nd = parseReceiptBundle('{"a":1}\n\n{"b":2}\n', "x");
    expect(nd.receipts).toHaveLength(2);
    expect(nd.errors).toEqual([]);
  });

  it("never shrinks a bundle silently", () => {
    const nd = parseReceiptBundle('{"a":1}\nnot json\n{"b":2}', "x");
    expect(nd.receipts).toHaveLength(2);
    expect(nd.errors).toHaveLength(1);
    expect(nd.errors[0]).toMatch(/line 2/);
    const bad = parseReceiptBundle("hello", "x");
    expect(bad.receipts).toEqual([]);
    expect(bad.errors).toHaveLength(1);
    const scalar = parseReceiptBundle("42", "x");
    expect(scalar.receipts).toEqual([]);
    expect(scalar.errors[0]).toMatch(/not a receipt/);
    expect(parseReceiptBundle("[1,2]", "x").errors).toHaveLength(1);
  });

  it("empty input is neither receipts nor an error", () => {
    expect(parseReceiptBundle("   ")).toEqual({ receipts: [], errors: [] });
  });
});

describe("runKey", () => {
  it("is spelling-insensitive on felts and sensitive to every signed field", () => {
    const [r] = receiptsFor("StealthSplit", TX, [R(1, 5n)]);
    const rec = r as unknown as Record<string, unknown>;
    expect(runKey({ ...rec, org: "0x000" + ORG.slice(2) })).toBe(runKey(rec));
    expect(runKey({ ...rec, recipientCount: 2 })).not.toBe(runKey(rec));
    expect(runKey({ ...rec, merkleRoot: "0x1" })).not.toBe(runKey(rec));
    expect(runKey({ ...rec, operation: "GhostBounty" })).not.toBe(runKey(rec));
    expect(runKey({ ...rec, txHash: TX2 })).not.toBe(runKey(rec));
  });
});

describe("auditReceipts - a complete honest run", () => {
  it("verifies every row, sums the total, and reports full coverage", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n), R(3, 2n)]);
    const report = await auditReceipts(load(rs), allGood);
    expect(report.runs).toHaveLength(1);
    const run = report.runs[0];
    expect(run.verdict).toBe("verified");
    expect(run.claimedCount).toBe(3);
    expect(run.providedCount).toBe(3);
    expect(run.verifiedRows).toBe(3);
    expect(run.verifiedTotal).toBe(10n * STRK);
    expect(run.claimedTotal).toBe(10n * STRK);
    expect(run.signature).toBe(true);
    expect(run.transaction).toBe("SUCCEEDED_POOL");
    expect(run.notes).toEqual([]);
    expect(run.rows.every((r) => r.result.ok)).toBe(true);
  });

  it("de-duplicates chain reads: one signature and one settlement read per run", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n), R(3, 2n), R(4, 1n)]);
    let sigCalls = 0;
    let txCalls = 0;
    await auditReceipts(load(rs), {
      signature: async () => (sigCalls++, true),
      settlement: async () => (txCalls++, "SUCCEEDED_POOL"),
    });
    expect(sigCalls).toBe(1);
    expect(txCalls).toBe(1);
  });

  it("reports progress once per unique receipt", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n)]);
    const ticks: [number, number][] = [];
    await auditReceipts(load([...rs, rs[0]]), allGood, {
      onProgress: (d, t) => ticks.push([d, t]),
    });
    expect(ticks).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});

describe("auditReceipts - coverage and duplicates", () => {
  it("partial coverage verifies the rows present and says what is missing", async () => {
    const rs = receiptsFor("StealthGrant round", TX, [R(1, 5n), R(2, 3n), R(3, 2n)]);
    const report = await auditReceipts(load(rs.slice(0, 2)), allGood);
    const run = report.runs[0];
    expect(run.verdict).toBe("partial");
    expect(run.providedCount).toBe(2);
    expect(run.verifiedTotal).toBe(8n * STRK);
    expect(run.notes.some((n) => /2 of 3 receipts present/.test(n))).toBe(true);
    expect(run.notes.some((n) => /not evidence of anything/.test(n))).toBe(true);
  });

  it("drops a byte-identical duplicate file without affecting the verdict", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n)]);
    const report = await auditReceipts(load([rs[0], rs[1], { ...rs[0] }]), allGood);
    expect(report.duplicatesIgnored).toBe(1);
    expect(report.rowCount).toBe(2);
    expect(report.runs[0].verdict).toBe("verified");
    expect(report.runs[0].verifiedTotal).toBe(8n * STRK);
  });

  it("two receipts naming one recipient with different amounts is a failure, not a bigger total", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n)]);
    // A forged sibling: same recipient, different amount, proof will not verify.
    const forged = { ...rs[0], amount: "0x" + (9n * STRK).toString(16) };
    const report = await auditReceipts(load([rs[0], rs[1], forged]), allGood);
    const run = report.runs[0];
    expect(run.verdict).toBe("failed");
    expect(run.notes.some((n) => /more than one receipt/.test(n))).toBe(true);
    const flagged = run.rows.filter((r) => r.flags.length > 0);
    expect(flagged).toHaveLength(2);
    // The forged row fails Merkle; the genuine row still verifies on its own.
    expect(run.rows.find((r) => r.source === "file-3.json")?.result.merkle).toBe(false);
    expect(run.verifiedTotal).toBe(8n * STRK);
  });

  it("more distinct recipients than the signed count is a failure", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n)]);
    const extra = { ...rs[0], recipient: R(7, 1n).address };
    const report = await auditReceipts(load([...rs, extra]), allGood);
    expect(report.runs[0].verdict).toBe("failed");
    expect(report.runs[0].notes.some((n) => /more receipts than the run can contain/.test(n))).toBe(true);
  });
});

describe("auditReceipts - failures and inconclusive reads", () => {
  it("a bad signature fails the whole run", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n)]);
    const report = await auditReceipts(load(rs), { ...allGood, signature: async () => false });
    expect(report.runs[0].verdict).toBe("failed");
    expect(report.runs[0].signature).toBe(false);
    expect(report.runs[0].verifiedRows).toBe(0);
    expect(report.runs[0].verifiedTotal).toBe(0n);
    expect(report.runs[0].claimedTotal).toBe(8n * STRK);
  });

  it("an unreachable chain is inconclusive, never verified", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n)]);
    const report = await auditReceipts(load(rs), { ...allGood, signature: async () => null });
    expect(report.runs[0].verdict).toBe("inconclusive");
    expect(report.runs[0].signature).toBeNull();
    const report2 = await auditReceipts(load(rs), { ...allGood, settlement: async () => "UNKNOWN" });
    expect(report2.runs[0].verdict).toBe("inconclusive");
  });

  it("a settlement that did not touch the pool, reverted, or is missing fails", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n)]);
    for (const tx of ["SUCCEEDED_NOT_POOL", "REVERTED", "NOT_FOUND"] as const) {
      const report = await auditReceipts(load(rs), { ...allGood, settlement: async () => tx });
      expect(report.runs[0].verdict).toBe("failed");
      expect(report.runs[0].transaction).toBe(tx);
    }
  });

  it("a malformed file is a failed row with a note, and does not crash the audit", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n)]);
    const report = await auditReceipts(load([rs[0], { hello: "world" }, "junk", null]), allGood);
    const runs = report.runs;
    expect(runs.some((r) => r.verdict === "verified")).toBe(true);
    const bad = runs.filter((r) => r.verdict === "failed");
    expect(bad.length).toBeGreaterThan(0);
    expect(bad.every((r) => r.notes.some((n) => /not a well-formed receipt/.test(n)))).toBe(true);
  });

  it("does not let a tampered amount through even when the chain says yes", async () => {
    const rs = receiptsFor("GhostBounty payout", TX, [R(1, 5n)]);
    const tampered = { ...rs[0], amount: "0x" + (50n * STRK).toString(16) };
    const report = await auditReceipts(load([tampered]), allGood);
    expect(report.runs[0].rows[0].result.merkle).toBe(false);
    expect(report.runs[0].verdict).toBe("failed");
    expect(report.runs[0].verifiedTotal).toBe(0n);
  });
});

describe("auditReceipts - several runs at once", () => {
  it("groups receipts by run and audits each independently", async () => {
    const a = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n)]);
    const b = receiptsFor("GhostBounty payout", TX2, [R(3, 7n)]);
    const report = await auditReceipts(load([a[0], b[0], a[1]]), allGood);
    expect(report.runs).toHaveLength(2);
    expect(report.runs.map((r) => r.operation)).toEqual(["StealthSplit", "GhostBounty payout"]);
    expect(report.runs[0].verifiedTotal).toBe(8n * STRK);
    expect(report.runs[1].verifiedTotal).toBe(7n * STRK);
    expect(report.notes).toEqual([]);
  });

  it("flags two attestations for the same settlement transaction", async () => {
    const first = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n)]);
    const again = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n)]); // re-signed: new salts, new root
    const report = await auditReceipts(load([...first, ...again]), allGood);
    expect(report.runs).toHaveLength(2);
    expect(report.notes).toHaveLength(1);
    expect(report.notes[0]).toMatch(/2 distinct attestations reference the same settlement/);
    expect(report.notes[0]).toMatch(/not as additive/);
  });
});

describe("auditReportCsv", () => {
  it("emits one line per receipt with exact amounts and escaped flags", async () => {
    const rs = receiptsFor("StealthSplit", TX, [R(1, 5n), R(2, 3n)]);
    const forged = { ...rs[0], amount: "0x" + (9n * STRK).toString(16) };
    const loaded = load([rs[0], rs[1], forged]);
    loaded[2].source = 'payroll, "final".json'; // comma and quotes must survive
    const report = await auditReceipts(loaded, allGood);
    const csv = auditReportCsv(report);
    const lines = csv.trimEnd().split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toMatch(/^run_operation,run_tx_hash/);
    expect(lines[1]).toContain(",5,");
    expect(lines[1]).toContain((5n * STRK).toString());
    const flaggedLines = lines.filter((l) => l.includes("at most one can be genuine"));
    expect(flaggedLines).toHaveLength(2);
    // RFC 4180: a cell with a comma or quotes is quoted, quotes doubled.
    const forgedLine = lines.find((l) => l.includes("final"));
    expect(forgedLine).toContain('"payroll, ""final"".json"');
    expect(forgedLine).toMatch(/,false,/); // merkle failed on the forged row
  });
});
