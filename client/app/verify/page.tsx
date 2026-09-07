"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import SiteFooter from "@/components/SiteFooter";
import AuditReportView from "@/components/AuditReportView";
import {
  auditReceipts,
  parseReceiptBundle,
  type AuditReport,
  type LoadedReceipt,
  type RunVerdict,
} from "@/lib/audit";
import type { PayoutReceipt, ReceiptVerification } from "@/lib/receipts";
import { formatTokenAmountExact } from "@/lib/strk20";
import { shorten, voyagerTx } from "@/lib/config";

type State =
  | { kind: "idle" }
  | { kind: "verifying"; done: number; total: number }
  | { kind: "single"; receipt: PayoutReceipt; result: ReceiptVerification; verdict: RunVerdict }
  | { kind: "audit"; report: AuditReport }
  | { kind: "error"; message: string };

function Row({ ok, label }: { ok: boolean | null; label: string }) {
  const verdict = ok === true ? "passed" : ok === null ? "unchecked" : "FAILED";
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-full ${
          ok === true ? "bg-emerald-400" : ok === null ? "bg-amber-400" : "bg-red-400"
        }`}
      />
      <span className="text-sm text-white/70">
        {label}{" "}
        <span className={ok === false ? "text-red-300" : "text-white/40"}>({verdict})</span>
      </span>
    </li>
  );
}

const TX_LABEL: Record<ReceiptVerification["transaction"], string> = {
  SUCCEEDED_POOL: "settled and touched the STRK20 pool",
  SUCCEEDED_NOT_POOL: "settled but did NOT touch the pool",
  REVERTED: "REVERTED",
  NOT_FOUND: "NOT FOUND on mainnet",
  UNKNOWN: "could not be checked",
};

/** The one-receipt view - a recipient checking their own file. */
function SingleResult({
  receipt,
  result,
  verdict,
}: {
  receipt: PayoutReceipt;
  result: ReceiptVerification;
  verdict: RunVerdict;
}) {
  // One verdict rule for both views: the audit already computed it, and
  // a definite settlement failure must never read as "chain unreachable".
  const inconclusive = verdict === "inconclusive";
  return (
    <div
      className={`rounded-xl border p-5 ${
        result.ok
          ? "border-emerald-400/25 bg-emerald-400/[0.05]"
          : inconclusive
            ? "border-amber-400/25 bg-amber-400/[0.05]"
            : "border-red-400/25 bg-red-400/[0.05]"
      }`}
    >
      <p className="text-sm font-medium text-white">
        {result.ok
          ? "Attestation verifies - the signing account stands behind this receipt"
          : inconclusive
            ? "Inconclusive - the org signature or the settlement could not be checked"
            : "Receipt does NOT verify"}
      </p>
      <ul className="mt-3 space-y-2">
        <Row ok={result.structure} label="Well-formed receipt" />
        <Row ok={result.merkle} label="Recipient + amount are inside the signed commitment" />
        <Row
          ok={result.signature}
          label={
            result.signature === null
              ? "Org signature - could not reach the chain to check"
              : "Org account signed this run (checked onchain)"
          }
        />
        <Row
          ok={result.transaction === "SUCCEEDED_POOL" ? true : result.transaction === "UNKNOWN" ? null : false}
          label={`Referenced transaction: ${TX_LABEL[result.transaction]}`}
        />
      </ul>
      {result.structure ? (
        <dl className="mt-4 space-y-1 border-t border-white/10 pt-3 text-xs text-white/50">
          <div className="flex justify-between gap-4">
            <dt>Operation</dt>
            <dd className="text-white/70">{receipt.operation}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Recipient</dt>
            <dd className="font-mono">{shorten(receipt.recipient, 12, 6)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Amount (derived from the signed value)</dt>
            <dd className="text-white/70">
              {(() => {
                try {
                  return `${formatTokenAmountExact(BigInt(receipt.amount))} STRK`;
                } catch {
                  return "unreadable";
                }
              })()}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Org</dt>
            <dd className="font-mono">{shorten(receipt.org, 12, 6)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Run size</dt>
            <dd className="text-white/70">{receipt.recipientCount} recipient{receipt.recipientCount === 1 ? "" : "s"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Settlement</dt>
            <dd>
              <a
                className="font-mono text-white/70 underline underline-offset-4 hover:text-white"
                href={voyagerTx(receipt.txHash)}
                target="_blank"
                rel="noreferrer"
              >
                {shorten(receipt.txHash, 12, 6)}
              </a>
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}

/**
 * Public receipt verification, for one receipt or a whole run. Pure math
 * plus public RPC reads; no wallet, no account, no trust in Cloakra.
 * Verifies the org's ATTESTATION - the shielded transfer itself is
 * unverifiable by design, and the page says so.
 */
export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<LoadedReceipt[]>([]);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const fileInput = useRef<HTMLInputElement>(null);
  // Latest-wins: clearing files or starting a new audit makes an in-flight
  // one stale, so its progress and result can never paint over the newer.
  const auditRun = useRef(0);

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const next: LoadedReceipt[] = [];
    const errs: string[] = [];
    for (const f of Array.from(list)) {
      try {
        const { receipts, errors } = parseReceiptBundle(await f.text(), f.name);
        next.push(...receipts);
        errs.push(...errors);
      } catch {
        errs.push(`${f.name}: could not be read.`);
      }
    }
    setFiles((prev) => [...prev, ...next]);
    setLoadErrors(errs);
    setState({ kind: "idle" });
  }, []);

  const clearFiles = useCallback(() => {
    auditRun.current++;
    setFiles([]);
    setLoadErrors([]);
    setState({ kind: "idle" });
    if (fileInput.current) fileInput.current.value = "";
  }, []);

  const onVerify = useCallback(async () => {
    const pasted = parseReceiptBundle(input, "pasted");
    const all = [...files, ...pasted.receipts];
    if (pasted.errors.length > 0) setLoadErrors(pasted.errors);
    if (all.length === 0) {
      setState({
        kind: "error",
        message:
          pasted.errors[0] ?? "Add at least one receipt - drop files, choose them, or paste the JSON.",
      });
      return;
    }
    const token = ++auditRun.current;
    setState({ kind: "verifying", done: 0, total: all.length });
    try {
      const report = await auditReceipts(all, undefined, {
        onProgress: (done, total) => {
          if (auditRun.current === token) setState({ kind: "verifying", done, total });
        },
      });
      if (auditRun.current !== token) return;
      const only = report.rowCount === 1 && report.runs.length === 1 ? report.runs[0].rows[0] : null;
      if (only && only.result.structure) {
        setState({
          kind: "single",
          receipt: only.receipt as PayoutReceipt,
          result: only.result,
          verdict: report.runs[0].verdict,
        });
      } else if (only) {
        setState({ kind: "error", message: "That isn't a Cloakra receipt - check the file and try again." });
      } else {
        setState({ kind: "audit", report });
      }
    } catch {
      if (auditRun.current !== token) return;
      setState({ kind: "error", message: "Verification crashed - are these Cloakra receipt files?" });
    }
  }, [files, input]);

  const busy = state.kind === "verifying";
  const loadedCount = files.length;

  return (
    <>
      <PageHeader current="verify" />
      <main className="mx-auto max-w-4xl px-6 py-14 md:px-10">
        <p className="font-mono text-[11px] tracking-[0.25em] text-white/35 uppercase">Receipts</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Verify a receipt, or audit a whole run
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
          A <code className="text-white/70">cloakra-receipt-v1</code> file is the paying org&apos;s{" "}
          <strong className="text-white/75">signed attestation</strong> of who was paid what in
          which pool transaction. One receipt verifies a recipient&apos;s own row. Drop in every
          receipt from a run and this page verifies each row, groups them by run, checks the
          org&apos;s signature and the settlement once, totals what verifies, and reports the
          coverage - the auditor&apos;s desk for a private payroll. What it cannot prove is the
          shielded transfer&apos;s contents: the pool keeps those private by design, so a receipt is
          exactly as trustworthy as its signer.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length > 0) void addFiles(e.dataTransfer.files);
          }}
          className={`mt-8 rounded-xl border border-dashed px-6 py-8 text-center transition ${
            dragging ? "border-white/60 bg-white/[0.05]" : "border-white/20 bg-white/[0.02]"
          }`}
        >
          <p className="text-sm text-white/70">
            Drop receipt files here{" "}
            <span className="text-white/40">- as many as you like -</span>
          </p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="mt-3 rounded-lg border border-white/20 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:border-white/40 disabled:opacity-50"
          >
            Choose files
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".json,application/json,.jsonl,.ndjson,text/plain"
            className="sr-only"
            aria-label="Receipt files"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
            }}
          />
          {loadedCount > 0 ? (
            <p className="mt-3 text-xs text-white/50">
              {loadedCount} receipt{loadedCount === 1 ? "" : "s"} loaded from files ·{" "}
              <button type="button" onClick={clearFiles} className="underline underline-offset-4 hover:text-white">
                clear
              </button>
            </p>
          ) : null}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='…or paste receipt JSON - one receipt, a list, or one per line'
          rows={6}
          aria-label="Receipt JSON"
          className="mt-4 w-full rounded-lg border border-white/15 bg-transparent px-4 py-3 font-mono text-xs text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none"
        />

        {loadErrors.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-red-200/80">
            {loadErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          onClick={onVerify}
          disabled={busy || (!input.trim() && loadedCount === 0)}
          className="mt-4 rounded-lg border border-white/20 bg-white/[0.05] px-5 py-2.5 font-medium text-white transition hover:border-white/40 disabled:opacity-50"
        >
          {state.kind === "verifying"
            ? `Verifying ${state.done}/${state.total}…`
            : loadedCount + (input.trim() ? 1 : 0) > 1
              ? "Audit the run"
              : "Verify"}
        </button>

        {state.kind === "error" ? (
          <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">
            {state.message}
          </p>
        ) : null}

        <div className="mt-8">
          {state.kind === "single" ? (
            <SingleResult receipt={state.receipt} result={state.result} verdict={state.verdict} />
          ) : null}
          {state.kind === "audit" ? <AuditReportView report={state.report} /> : null}
        </div>

        <p className="mt-10 text-xs text-white/40">
          Receipts are produced in the app after a run settles - see{" "}
          <Link className="underline underline-offset-4 hover:text-white/70" href="/docs#receipts">
            the docs
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
