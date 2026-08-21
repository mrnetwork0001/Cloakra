"use client";

import { useCallback, useRef, useState } from "react";
import type { WalletAccountV6 } from "starknet";
import {
  buildSplit,
  executeStrk20,
  formatTokenAmount,
  parseAddress,
  parseTokenAmount,
  sameFelt,
  walletErrorKind,
  walletErrorMessage,
  type PanelPhase,
} from "@/lib/strk20";
import { usePoolFee } from "@/lib/hooks";
import { COPY } from "@/lib/copy";
import { parseRecipientsCsv } from "@/lib/csv";
import TxOutcome from "./TxOutcome";

const MAX_RECIPIENTS = 10;

interface Row {
  id: number;
  address: string;
  amount: string;
}

/**
 * StealthSplit — the hero. One shielded balance disbursed to N recipients in
 * a single atomic transaction: all transfers land or none do, and no
 * recipient can see what any other recipient received.
 */
export default function SplitPanel({
  account,
  address,
  disabled = false,
  title = "StealthSplit",
  description = "Disburse one shielded balance to the whole team in a single atomic transaction. All transfers land or none do — and no recipient can read anyone else's amount.",
}: {
  account: WalletAccountV6;
  address: string;
  disabled?: boolean;
  /** Module framing — GhostGrant/StealthGrant reuse these same rails. */
  title?: string;
  description?: string;
}) {
  const rowIdRef = useRef(0);
  const newRow = useCallback(
    (): Row => ({ id: ++rowIdRef.current, address: "", amount: "" }),
    [],
  );
  const [rows, setRows] = useState<Row[]>(() => [
    { id: ++rowIdRef.current, address: "", amount: "" },
    { id: ++rowIdRef.current, address: "", amount: "" },
  ]);
  const [phase, setPhase] = useState<PanelPhase>({ kind: "form" });
  const fee = usePoolFee(phase.kind === "form" || phase.kind === "error");
  const [settledCount, setSettledCount] = useState(0);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvNote, setCsvNote] = useState<string | null>(null);

  const setRow = useCallback((id: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => (prev.length < MAX_RECIPIENTS ? [...prev, newRow()] : prev));
  }, [newRow]);

  const removeRow = useCallback((id: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const onBack = useCallback(() => {
    // Reset to a blank form: a pre-filled payroll behind an enabled submit
    // button is one accidental click away from paying everyone twice.
    setRows([newRow(), newRow()]);
    setCsvText("");
    setCsvOpen(false);
    setCsvNote(null);
    setPhase({ kind: "form" });
  }, [newRow]);

  const onApplyCsv = useCallback(() => {
    setCsvNote(null);
    const { recipients, errors } = parseRecipientsCsv(csvText, MAX_RECIPIENTS);
    if (errors.length) {
      setPhase({
        kind: "error",
        message: `CSV: ${errors.slice(0, 4).join(" · ")}${errors.length > 4 ? ` · +${errors.length - 4} more` : ""}`,
      });
      return;
    }
    if (recipients.length === 0) {
      setPhase({ kind: "error", message: "CSV: no valid rows found." });
      return;
    }
    setRows(
      recipients.map((r) => ({
        id: ++rowIdRef.current,
        address: r.address,
        amount: r.amount,
      })),
    );
    setCsvOpen(false);
    setCsvNote(
      `${recipients.length} recipient${recipients.length === 1 ? "" : "s"} filled from CSV — replacing any typed rows. Review before submitting.`,
    );
    setPhase({ kind: "form" });
  }, [csvText]);

  // Best-effort running total for display; invalid rows count as 0.
  const total = rows.reduce((sum, r) => {
    try {
      return sum + parseTokenAmount(r.amount);
    } catch {
      return sum;
    }
  }, 0n);

  const onSplit = useCallback(async () => {
    if (!sameFelt(account.address, address)) {
      setPhase({ kind: "error", message: COPY.accountChanged });
      return;
    }

    const parsed: { address: string; raw: bigint }[] = [];
    const seen = new Set<string>();
    for (const [i, row] of rows.entries()) {
      let to: string;
      let raw: bigint;
      try {
        to = parseAddress(row.address);
        if (sameFelt(to, address)) {
          throw new Error("that's your own address");
        }
        raw = parseTokenAmount(row.amount);
      } catch (err) {
        setPhase({
          kind: "error",
          message: `Recipient ${i + 1}: ${(err as Error).message}`,
        });
        return;
      }
      // parseAddress normalizes, so the Set key is collision-safe.
      if (seen.has(to)) {
        setPhase({
          kind: "error",
          message: `Recipient ${i + 1} repeats an earlier address — merge the rows.`,
        });
        return;
      }
      seen.add(to);
      parsed.push({ address: to, raw });
    }

    setPhase({ kind: "submitting" });
    try {
      const outcome = await executeStrk20(account, buildSplit(parsed), title);
      setSettledCount(parsed.length);
      setPhase({ kind: "done", outcome });
    } catch (err) {
      const kind = walletErrorKind(err);
      setPhase({
        kind: "error",
        message:
          kind === "refused"
            ? "Split declined in the wallet."
            : kind === "not_registered"
              ? "This account or at least one recipient isn't registered in the pool. Registration is the 'Enable private tokens' step inside Ready — run it there (dapp-initiated operations can't trigger it), and every recipient must have done the same."
              : kind === "insufficient_private"
                ? "Not enough shielded balance for the full split — remember fees, and freshly shielded notes mature ~10 blocks."
                : `Split failed: ${walletErrorMessage(err)}`,
      });
    }
  }, [account, address, rows]);

  if (phase.kind === "done") {
    return (
      <TxOutcome
        outcome={phase.outcome}
        operation={title}
        confirmedTitle="Split settled"
        confirmedBody={`All ${settledCount} transfers landed in one atomic transaction. Each recipient holds an independent shielded balance — none of them can see the others' allocations.`}
        revertedBody="The split was included but reverted — the batch is atomic, so no recipient received anything. Possible causes: immature notes (~10 blocks), insufficient shielded balance for the full batch, or a fee change."
        onBack={onBack}
      />
    );
  }

  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/[0.02] p-6 ${disabled ? "opacity-60" : ""}`}
    >
      <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
        {title}
      </h2>
      <p className="mt-2 text-sm text-white/50">{description}</p>

      <div className="mt-4 space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="flex gap-2">
            <input
              type="text"
              value={row.address}
              onChange={(e) => setRow(row.id, { address: e.target.value })}
              placeholder={`Recipient ${i + 1} (0x…)`}
              disabled={disabled || phase.kind === "submitting"}
              className="w-full flex-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
            />
            <input
              type="text"
              inputMode="decimal"
              value={row.amount}
              onChange={(e) => setRow(row.id, { amount: e.target.value })}
              placeholder="STRK"
              disabled={disabled || phase.kind === "submitting"}
              className="w-28 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={disabled || rows.length <= 1 || phase.kind === "submitting"}
              aria-label={`Remove recipient ${i + 1}`}
              className="rounded-lg border border-white/10 px-3 text-white/40 transition hover:border-white/25 hover:text-white/70 disabled:opacity-30"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-4">
        <button
          type="button"
          onClick={addRow}
          disabled={disabled || rows.length >= MAX_RECIPIENTS || phase.kind === "submitting"}
          className="text-sm text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline disabled:opacity-40"
        >
          + Add recipient
        </button>
        <button
          type="button"
          onClick={() => setCsvOpen((v) => !v)}
          disabled={disabled || phase.kind === "submitting"}
          className="text-sm text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline disabled:opacity-40"
        >
          {csvOpen ? "Hide CSV" : "Paste CSV"}
        </button>
      </div>

      {csvOpen ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={"0xabc…, 12.5\n0xdef…, 7"}
            rows={4}
            disabled={disabled || phase.kind === "submitting"}
            className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 font-mono text-xs text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={onApplyCsv}
            disabled={disabled || !csvText.trim() || phase.kind === "submitting"}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-40"
          >
            Validate &amp; fill rows
          </button>
          <p className="text-xs text-white/35">
            One recipient per line: <code>address, amount</code>. Every row
            passes the same validation as the form — nothing is sent yet.
          </p>
        </div>
      ) : null}

      {csvNote ? (
        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
          {csvNote}
        </p>
      ) : null}

      <dl className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm text-white/50">
        <div className="flex justify-between">
          <dt>Total to disburse</dt>
          <dd className="text-white/80">{formatTokenAmount(total)} STRK</dd>
        </div>
        <div className="flex justify-between">
          <dt>Pool fee (per operation)</dt>
          <dd>{fee !== null ? `${formatTokenAmount(fee)} STRK` : "…"}</dd>
        </div>
      </dl>

      <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
        Whether a batched split pays the fee once or per transfer is settled by
        the pool — Ready shows the exact total before you sign.{" "}
        {COPY.recipientPrereq}
      </p>

      {phase.kind === "error" ? (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {phase.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSplit}
        disabled={
          disabled ||
          phase.kind === "submitting" ||
          rows.some((r) => !r.address.trim() || !r.amount.trim())
        }
        className="mt-4 w-full rounded-lg border border-white/20 bg-white/[0.05] px-4 py-2.5 font-medium text-white transition hover:border-white/40 hover:bg-white/[0.08] disabled:opacity-50"
      >
        {phase.kind === "submitting"
          ? "Waiting for wallet…"
          : `Split to ${rows.length} recipient${rows.length === 1 ? "" : "s"}`}
      </button>
    </section>
  );
}
