/**
 * Auditor mode: verify a whole payout run from its receipts.
 *
 * A recipient holds one receipt; an auditor holds a folder of them and one
 * question - did this organization pay what it claims? This module takes any
 * number of receipt files, groups them by the run their signed fields
 * describe, verifies every row with the same checks /verify applies to one
 * receipt, and reports per run: coverage (n of N receipts present), the
 * verified total, one signature verdict, one settlement verdict, and the
 * anomalies an honest run cannot produce.
 *
 * The limits are the receipt scheme's limits. A run's receipts prove what the
 * org ATTESTED; the shielded settlement stays private by design. Coverage is
 * over the receipts provided - a missing receipt is a gap in the audit, not
 * evidence of anything.
 */

import {
  checkReceiptMerkle,
  checkReceiptStructure,
  checkRunSignature,
  checkSettlement,
  receiptOk,
  type PayoutReceipt,
  type ReceiptVerification,
} from "./receipts";
import { formatTokenAmountExact } from "./strk20";

export interface LoadedReceipt {
  /** Where it came from: a file name, or "paste #n". */
  source: string;
  receipt: unknown;
}

/**
 * Accept one receipt, a JSON array of receipts, or newline-delimited JSON
 * (one receipt per line). Never guesses past that: anything else is an error
 * with the reason, so a corrupt bundle cannot shrink an audit silently.
 */
export function parseReceiptBundle(
  text: string,
  source = "paste",
): { receipts: LoadedReceipt[]; errors: string[] } {
  const trimmed = text.trim();
  if (!trimmed) return { receipts: [], errors: [] };

  const asObjects = (value: unknown, label: string): LoadedReceipt[] | null => {
    if (Array.isArray(value)) {
      if (!value.every((v) => typeof v === "object" && v !== null)) return null;
      return value.map((v, i) => ({ source: `${label} [${i + 1}]`, receipt: v }));
    }
    if (typeof value === "object" && value !== null) return [{ source: label, receipt: value }];
    return null;
  };

  try {
    const whole = JSON.parse(trimmed);
    const receipts = asObjects(whole, source);
    if (receipts) return { receipts, errors: [] };
    return { receipts: [], errors: [`${source}: JSON is not a receipt or a list of receipts.`] };
  } catch {
    /* fall through to NDJSON */
  }

  const lines = trimmed.split(/\r\n|\r|\n/);
  const receipts: LoadedReceipt[] = [];
  const errors: string[] = [];
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    try {
      const value = JSON.parse(line);
      const got = asObjects(value, `${source} line ${i + 1}`);
      if (got) receipts.push(...got);
      else errors.push(`${source} line ${i + 1}: not a receipt object.`);
    } catch {
      errors.push(`${source} line ${i + 1}: not valid JSON.`);
    }
  });
  if (receipts.length === 0 && errors.length > 0) {
    return {
      receipts: [],
      errors: [`${source}: not valid JSON - paste one receipt, a JSON list, or one receipt per line.`],
    };
  }
  return { receipts, errors };
}

const felt = (v: unknown): string => {
  try {
    return "0x" + BigInt(v as string).toString(16);
  } catch {
    return `!${String(v)}`;
  }
};

/** The signed fields that identify a run. Receipts that share them were
 * produced by the same signature request. */
export function runKey(r: Record<string, unknown>): string {
  return [
    String(r.operation),
    felt(r.org),
    felt(r.txHash),
    felt(r.pool),
    felt(r.chainId),
    String(r.recipientCount),
    felt(r.merkleRoot),
  ].join("|");
}

export type RunVerdict = "verified" | "partial" | "inconclusive" | "failed";

export interface AuditRow {
  source: string;
  receipt: PayoutReceipt | Record<string, unknown>;
  result: ReceiptVerification;
  /** Derived from the signed hex, never from amountDisplay. null = unreadable. */
  amount: bigint | null;
  recipient: string;
  /** Row-level anomalies, e.g. a second receipt naming the same recipient. */
  flags: string[];
}

export interface AuditRun {
  key: string;
  operation: string;
  org: string;
  txHash: string;
  merkleRoot: string;
  /** The recipient count the org signed. null when unreadable. */
  claimedCount: number | null;
  rows: AuditRow[];
  /** Distinct recipients among the rows. */
  providedCount: number;
  verifiedRows: number;
  /** Sum of amounts over rows that fully verify and are not in a recipient
   * conflict. */
  verifiedTotal: bigint;
  /** Sum over every readable row, verified or not - what the files CLAIM. */
  claimedTotal: bigint;
  signature: boolean | null;
  transaction: ReceiptVerification["transaction"];
  verdict: RunVerdict;
  /** Run-level anomalies and caveats, in display order. */
  notes: string[];
  /** Byte-identical duplicate files dropped before verification. */
  duplicatesIgnored: number;
}

export interface AuditReport {
  runs: AuditRun[];
  /** Rows verified, after duplicate files were dropped. */
  rowCount: number;
  duplicatesIgnored: number;
  /** Cross-run observations. */
  notes: string[];
}

export interface AuditCheckers {
  signature: (receipt: PayoutReceipt) => Promise<boolean | null>;
  settlement: (txHash: string) => Promise<ReceiptVerification["transaction"]>;
}

const defaultCheckers: AuditCheckers = {
  signature: checkRunSignature,
  settlement: checkSettlement,
};

/** Small concurrency limiter so a 50-receipt audit does not fan out 100
 * RPC calls at once. */
function limiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    active--;
    queue.shift()?.();
  };
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn().then(resolve, reject).finally(next);
      };
      if (active < max) run();
      else queue.push(run);
    });
}

const canonical = (value: unknown): string => JSON.stringify(sortKeys(value));
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/**
 * Identity of a receipt for de-duplication: every field a check reads. Two
 * files that differ only in unsigned, unchecked fields (note, amountDisplay)
 * or in how a felt is spelled are the same receipt - reporting them as a
 * recipient conflict would call an honest resend a forgery. Malformed files
 * fall back to their canonical JSON.
 */
function dedupeKey(receipt: unknown): string {
  if (!checkReceiptStructure(receipt)) return canonical(receipt);
  return [
    runKey(receipt as unknown as Record<string, unknown>),
    felt(receipt.recipient),
    felt(receipt.amount),
    felt(receipt.salt),
    receipt.proof.map(felt).join(","),
    receipt.signature.map(felt).join(","),
  ].join("|");
}

/**
 * Verify every receipt and fold the results into runs. Chain checks are
 * de-duplicated: one signature read per distinct (run, signature) and one
 * settlement read per transaction, however many receipts share them.
 */
export async function auditReceipts(
  loaded: LoadedReceipt[],
  checkers: AuditCheckers = defaultCheckers,
  options?: { concurrency?: number; onProgress?: (done: number, total: number) => void },
): Promise<AuditReport> {
  // Drop duplicates (the same file dragged twice, or resent with a new note).
  const seen = new Set<string>();
  const unique: LoadedReceipt[] = [];
  let duplicatesIgnored = 0;
  for (const item of loaded) {
    const c = dedupeKey(item.receipt);
    if (seen.has(c)) {
      duplicatesIgnored++;
      continue;
    }
    seen.add(c);
    unique.push(item);
  }

  const limit = limiter(options?.concurrency ?? 4);
  const sigCache = new Map<string, Promise<boolean | null>>();
  const txCache = new Map<string, Promise<ReceiptVerification["transaction"]>>();
  let done = 0;
  const total = unique.length;
  const tick = () => options?.onProgress?.(++done, total);

  const rows = await Promise.all(
    unique.map(async ({ source, receipt }): Promise<AuditRow & { key: string }> => {
      const rec = (typeof receipt === "object" && receipt !== null ? receipt : {}) as Record<
        string,
        unknown
      >;
      const key = runKey(rec);
      const result: ReceiptVerification = {
        structure: false,
        merkle: false,
        signature: null,
        transaction: "UNKNOWN",
        ok: false,
      };
      let amount: bigint | null = null;
      let recipient = typeof rec.recipient === "string" ? rec.recipient : "";

      if (checkReceiptStructure(receipt)) {
        result.structure = true;
        amount = BigInt(receipt.amount);
        recipient = "0x" + BigInt(receipt.recipient).toString(16);
        result.merkle = checkReceiptMerkle(receipt);

        const sigKey = `${key}|${receipt.signature.map((s) => felt(s)).join(",")}`;
        let sig = sigCache.get(sigKey);
        if (!sig) {
          sig = limit(() => checkers.signature(receipt));
          sigCache.set(sigKey, sig);
        }
        const txKey = felt(receipt.txHash);
        let tx = txCache.get(txKey);
        if (!tx) {
          tx = limit(() => checkers.settlement(receipt.txHash));
          txCache.set(txKey, tx);
        }
        [result.signature, result.transaction] = await Promise.all([sig, tx]);
        result.ok = receiptOk(result);
      }
      tick();
      return { key, source, receipt: rec, result, amount, recipient, flags: [] };
    }),
  );

  // Group by run, preserving first-seen order.
  const runs = new Map<string, AuditRun>();
  for (const row of rows) {
    const rec = row.receipt as Record<string, unknown>;
    let run = runs.get(row.key);
    if (!run) {
      const count = rec.recipientCount;
      run = {
        key: row.key,
        operation: typeof rec.operation === "string" ? rec.operation : "unknown",
        org: typeof rec.org === "string" ? rec.org : "",
        txHash: typeof rec.txHash === "string" ? rec.txHash : "",
        merkleRoot: typeof rec.merkleRoot === "string" ? rec.merkleRoot : "",
        claimedCount:
          typeof count === "number" && Number.isInteger(count) && count > 0 ? count : null,
        rows: [],
        providedCount: 0,
        verifiedRows: 0,
        verifiedTotal: 0n,
        claimedTotal: 0n,
        signature: null,
        transaction: "UNKNOWN",
        verdict: "failed",
        notes: [],
        duplicatesIgnored: 0,
      };
      runs.set(row.key, run);
    }
    run.rows.push(row);
  }

  for (const run of runs.values()) finalizeRun(run);

  // Cross-run: the same settlement attested under two different roots.
  const notes: string[] = [];
  const byTx = new Map<string, AuditRun[]>();
  for (const run of runs.values()) {
    if (!run.txHash) continue;
    const k = felt(run.txHash);
    byTx.set(k, [...(byTx.get(k) ?? []), run]);
  }
  for (const group of byTx.values()) {
    if (group.length > 1) {
      notes.push(
        `${group.length} distinct attestations reference the same settlement transaction ${short(group[0].txHash)}. Each may carry a valid signature; treat their recipient sets as alternative statements from the org, not as additive.`,
      );
    }
  }

  return { runs: [...runs.values()], rowCount: rows.length, duplicatesIgnored, notes };
}

const short = (v: string) => (v.length > 14 ? `${v.slice(0, 8)}…${v.slice(-4)}` : v);

function finalizeRun(run: AuditRun): void {
  // Recipient conflicts: an honest run has one leaf per recipient (the
  // payroll parser rejects duplicate addresses), so two receipts naming one
  // recipient cannot both be from the original run.
  const byRecipient = new Map<string, AuditRow[]>();
  for (const row of run.rows) {
    if (!row.result.structure) continue;
    byRecipient.set(row.recipient, [...(byRecipient.get(row.recipient) ?? []), row]);
  }
  let conflicts = 0;
  // At most one of a conflicting pair is genuine and the code cannot tell
  // which, so neither may count toward the verified figures.
  const conflicted = new Set<AuditRow>();
  for (const [, rowsFor] of byRecipient) {
    if (rowsFor.length > 1) {
      conflicts++;
      for (const row of rowsFor) {
        conflicted.add(row);
        row.flags.push(
          `${rowsFor.length} receipts in this run name this recipient - at most one can be genuine.`,
        );
      }
    }
  }
  run.providedCount = byRecipient.size;

  let anyFail = false;
  let anyUnknown = false;
  let sigTrue = 0;
  let sigFalse = 0;
  let sigNull = 0;
  const txKinds = new Set<ReceiptVerification["transaction"]>();
  for (const row of run.rows) {
    const r = row.result;
    if (row.amount !== null) run.claimedTotal += row.amount;
    if (r.ok && !conflicted.has(row)) {
      run.verifiedRows++;
      run.verifiedTotal += row.amount ?? 0n;
    }
    if (!r.structure || !r.merkle) anyFail = true;
    if (r.signature === true) sigTrue++;
    else if (r.signature === false) sigFalse++;
    else sigNull++;
    if (r.structure) txKinds.add(r.transaction);
    if (r.transaction === "SUCCEEDED_NOT_POOL" || r.transaction === "REVERTED" || r.transaction === "NOT_FOUND")
      anyFail = true;
    if (r.structure && (r.signature === null || r.transaction === "UNKNOWN")) anyUnknown = true;
  }
  if (sigFalse > 0) anyFail = true;
  run.signature = sigFalse > 0 ? false : sigNull > 0 ? null : sigTrue > 0 ? true : null;
  run.transaction =
    txKinds.size === 0
      ? "UNKNOWN"
      : txKinds.size === 1
        ? [...txKinds][0]
        : anyFail
          ? ([...txKinds].find((k) => k !== "SUCCEEDED_POOL" && k !== "UNKNOWN") ?? "UNKNOWN")
          : "UNKNOWN";

  if (conflicts > 0) {
    anyFail = true;
    run.notes.push(
      `${conflicts} recipient${conflicts === 1 ? "" : "s"} appear${conflicts === 1 ? "s" : ""} on more than one receipt.`,
    );
  }
  if (run.claimedCount !== null && run.providedCount > run.claimedCount) {
    anyFail = true;
    run.notes.push(
      `${run.providedCount} distinct recipients supplied, but the org signed a run of ${run.claimedCount} - more receipts than the run can contain.`,
    );
  }
  const malformed = run.rows.filter((r) => !r.result.structure).length;
  if (malformed > 0) {
    run.notes.push(`${malformed} file${malformed === 1 ? " is" : "s are"} not a well-formed receipt.`);
  }

  if (anyFail) run.verdict = "failed";
  else if (anyUnknown) run.verdict = "inconclusive";
  else if (run.claimedCount !== null && run.providedCount < run.claimedCount) {
    run.verdict = "partial";
    run.notes.push(
      `${run.providedCount} of ${run.claimedCount} receipts present - the verified total covers only those. Missing receipts are a gap in the audit, not evidence of anything.`,
    );
  } else run.verdict = "verified";
}

const csvCell = (v: string | number | bigint | boolean | null): string => {
  let s = v === null ? "" : String(v);
  // Spreadsheets evaluate a cell that starts with = + - @ TAB or CR as a
  // formula even when quoted (CSV injection). The operation string and the
  // file name are attacker-controlled: prefix with an apostrophe so the text
  // is shown, never run. Amounts are felts, never negative, so numeric
  // columns are untouched.
  const formulaLike = /^[=+\-@\t\r]/.test(s);
  if (formulaLike) s = "'" + s;
  return formulaLike || /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A flat, spreadsheet-ready report - one line per receipt. */
export function auditReportCsv(report: AuditReport): string {
  const header = [
    "run_operation",
    "run_tx_hash",
    "run_org",
    "run_verdict",
    "recipient",
    "amount_strk",
    "amount_raw",
    "structure",
    "merkle",
    "signature",
    "transaction",
    "ok",
    "flags",
    "source",
  ];
  const lines = [header.join(",")];
  for (const run of report.runs) {
    for (const row of run.rows) {
      lines.push(
        [
          run.operation,
          run.txHash,
          run.org,
          run.verdict,
          row.recipient,
          row.amount === null ? "" : formatTokenAmountExact(row.amount),
          row.amount === null ? "" : row.amount.toString(),
          row.result.structure,
          row.result.merkle,
          row.result.signature === null ? "unchecked" : row.result.signature,
          row.result.transaction,
          row.result.ok,
          row.flags.join("; "),
          row.source,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  return lines.join("\n") + "\n";
}
