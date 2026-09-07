"use client";

import { auditReportCsv, type AuditReport, type AuditRun, type RunVerdict } from "@/lib/audit";
import type { ReceiptVerification } from "@/lib/receipts";
import { formatTokenAmountExact } from "@/lib/strk20";
import { shorten, voyagerTx } from "@/lib/config";

const VERDICT: Record<RunVerdict, { label: string; tone: string; badge: string }> = {
  verified: {
    label: "Verified",
    tone: "border-emerald-400/25 bg-emerald-400/[0.05]",
    badge: "bg-emerald-400/15 text-emerald-200",
  },
  partial: {
    label: "Verified · partial coverage",
    tone: "border-amber-400/25 bg-amber-400/[0.05]",
    badge: "bg-amber-400/15 text-amber-200",
  },
  inconclusive: {
    label: "Inconclusive",
    tone: "border-amber-400/25 bg-amber-400/[0.05]",
    badge: "bg-amber-400/15 text-amber-200",
  },
  failed: {
    label: "Does NOT verify",
    tone: "border-red-400/25 bg-red-400/[0.05]",
    badge: "bg-red-400/15 text-red-200",
  },
};

const TX_LABEL: Record<ReceiptVerification["transaction"], string> = {
  SUCCEEDED_POOL: "settled · touched the pool",
  SUCCEEDED_NOT_POOL: "settled · did NOT touch the pool",
  REVERTED: "REVERTED",
  NOT_FOUND: "NOT FOUND on mainnet",
  UNKNOWN: "could not be checked",
};

function Dot({ ok, title }: { ok: boolean | null; title: string }) {
  const verdict = ok === true ? "passed" : ok === null ? "unchecked" : "FAILED";
  return (
    <span
      role="img"
      aria-label={`${title}: ${verdict}`}
      title={`${title}: ${verdict}`}
      className={`inline-block size-2 rounded-full ${
        ok === true ? "bg-emerald-400" : ok === null ? "bg-amber-400" : "bg-red-400"
      }`}
    />
  );
}

function txOk(t: ReceiptVerification["transaction"]): boolean | null {
  return t === "SUCCEEDED_POOL" ? true : t === "UNKNOWN" ? null : false;
}

const strk = (v: bigint) => `${formatTokenAmountExact(v)} STRK`;

function downloadCsv(report: AuditReport) {
  const blob = new Blob([auditReportCsv(report)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cloakra-audit.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function RunCard({ run }: { run: AuditRun }) {
  const v = VERDICT[run.verdict];
  return (
    <section className={`rounded-xl border p-5 ${v.tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{run.operation}</p>
          <p className="mt-1 font-mono text-xs text-white/45">
            org {shorten(run.org, 10, 6)} · root {shorten(run.merkleRoot, 8, 4)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${v.badge}`}>{v.label}</span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] tracking-[0.15em] text-white/35 uppercase">Receipts</dt>
          <dd className="mt-0.5 text-white">
            {run.providedCount}
            {run.claimedCount !== null ? (
              <span className="text-white/40"> of {run.claimedCount}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.15em] text-white/35 uppercase">
            {run.verdict === "failed" ? "Rows passing alone" : "Verified total"}
          </dt>
          <dd className="mt-0.5 text-white">{strk(run.verifiedTotal)}</dd>
          {run.claimedTotal !== run.verifiedTotal ? (
            <dd className="text-xs text-white/40">files claim {strk(run.claimedTotal)}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.15em] text-white/35 uppercase">Org signature</dt>
          <dd className="mt-0.5 flex items-center gap-2 text-white">
            <Dot ok={run.signature} title="Org signature" />
            {run.signature === true ? "signed" : run.signature === null ? "unchecked" : "FAILED"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.15em] text-white/35 uppercase">Settlement</dt>
          <dd className="mt-0.5 flex items-center gap-2 text-white">
            <Dot ok={txOk(run.transaction)} title="Settlement" />
            <a
              className="font-mono underline underline-offset-4 hover:text-white/80"
              href={run.txHash ? voyagerTx(run.txHash) : undefined}
              target="_blank"
              rel="noreferrer"
            >
              {run.txHash ? shorten(run.txHash, 8, 4) : "-"}
            </a>
          </dd>
          <dd className="text-xs text-white/40">{TX_LABEL[run.transaction]}</dd>
        </div>
      </dl>

      {run.notes.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-sm text-white/70">
          {run.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden className="text-white/30">·</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] tracking-[0.15em] text-white/35 uppercase">
              <th className="px-3 py-2 font-medium">Recipient</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium" title="structure · commitment · signature · settlement">
                Checks
              </th>
              <th className="px-3 py-2 font-medium">File</th>
            </tr>
          </thead>
          <tbody>
            {run.rows.map((row, i) => (
              <tr
                key={`${row.source}-${i}`}
                className={`border-b border-white/5 last:border-0 ${row.result.ok ? "" : "bg-red-400/[0.04]"}`}
              >
                <td className="px-3 py-2 font-mono text-xs text-white/80">
                  {row.recipient ? shorten(row.recipient, 10, 6) : <span className="text-white/35">unreadable</span>}
                  {row.flags.map((f) => (
                    <p key={f} className="mt-1 font-sans text-xs text-red-200/80">
                      {f}
                    </p>
                  ))}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-white">
                  {row.amount === null ? <span className="text-white/35">-</span> : strk(row.amount)}
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    <Dot ok={row.result.structure} title="Well-formed" />
                    <Dot ok={row.result.structure ? row.result.merkle : false} title="Inside the signed commitment" />
                    <Dot ok={row.result.structure ? row.result.signature : false} title="Org signature" />
                    <Dot ok={row.result.structure ? txOk(row.result.transaction) : false} title="Settlement" />
                  </span>
                </td>
                <td className="max-w-[12rem] truncate px-3 py-2 text-xs text-white/40" title={row.source}>
                  {row.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The auditor's desk: every run in the bundle, verified and totalled. */
export default function AuditReportView({ report }: { report: AuditReport }) {
  // Header figures count only runs that verify - a failed run's individually
  // passing rows are shown on its own card, never rolled into a headline.
  const verifiedRuns = report.runs.filter((r) => r.verdict === "verified" || r.verdict === "partial");
  const grandTotal = verifiedRuns.reduce((acc, r) => acc + r.verifiedTotal, 0n);
  const verifiedRows = verifiedRuns.reduce((acc, r) => acc + r.verifiedRows, 0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <dt className="text-[11px] tracking-[0.15em] text-white/35 uppercase">Runs</dt>
            <dd className="mt-0.5 text-lg text-white">
              {verifiedRuns.length}
              <span className="text-white/40"> / {report.runs.length} verify</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-[0.15em] text-white/35 uppercase">Receipts</dt>
            <dd className="mt-0.5 text-lg text-white">
              {verifiedRows}
              <span className="text-white/40"> / {report.rowCount} verify</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-[0.15em] text-white/35 uppercase">Verified total</dt>
            <dd className="mt-0.5 text-lg text-white">{strk(grandTotal)}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => downloadCsv(report)}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Download CSV report
        </button>
      </div>

      {report.duplicatesIgnored > 0 ? (
        <p className="text-xs text-white/45">
          {report.duplicatesIgnored} identical file{report.duplicatesIgnored === 1 ? "" : "s"} ignored.
        </p>
      ) : null}

      {report.notes.map((n) => (
        <p
          key={n}
          className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-100/90"
        >
          {n}
        </p>
      ))}

      {report.runs.map((run) => (
        <RunCard key={run.key} run={run} />
      ))}

      <p className="text-xs leading-relaxed text-white/40">
        Receipts prove the org&apos;s attestation, not the shielded transfers
        themselves - the pool keeps those private by design. Coverage counts the
        receipts you supplied against the count the org signed; a missing
        receipt is a gap in this audit, not evidence of anything.
      </p>
    </div>
  );
}
