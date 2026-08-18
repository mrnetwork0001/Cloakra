"use client";

import type { SubmitOutcome } from "@/lib/strk20";
import { shorten, voyagerTx } from "@/lib/config";

/**
 * Shared result screen for any STRK20 submission. One honest screen per
 * outcome — "confirmed" is only ever shown for execution SUCCEEDED. The
 * `operation` name keeps identity when several panels stack on one page, and
 * `revertedBody` lets each flow name only the causes it can actually have.
 */
export default function TxOutcome({
  outcome,
  operation,
  confirmedTitle,
  confirmedBody,
  revertedBody = "The transaction was included but reverted — no value moved. A pool-side check rejected it at execution.",
  onBack,
}: {
  outcome: SubmitOutcome;
  operation: string;
  confirmedTitle: string;
  confirmedBody: string;
  revertedBody?: string;
  onBack: () => void;
}) {
  const voyager = (
    <a
      className="text-sm text-white/80 underline underline-offset-4 hover:text-white"
      href={voyagerTx(outcome.txHash)}
      target="_blank"
      rel="noreferrer"
    >
      {shorten(outcome.txHash, 18, 4)} on Voyager
    </a>
  );
  const back = (
    <button
      type="button"
      onClick={onBack}
      className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30"
    >
      Back
    </button>
  );

  if (outcome.kind === "confirmed") {
    return (
      <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-6">
        <h2 className="text-sm font-medium tracking-wide text-emerald-200/70 uppercase">
          {confirmedTitle}
        </h2>
        <p className="mt-3 text-sm text-white/70">{confirmedBody}</p>
        <p className="mt-2">{voyager}</p>
        {back}
      </section>
    );
  }
  if (outcome.kind === "reverted") {
    return (
      <section className="rounded-xl border border-red-400/25 bg-red-400/[0.05] p-6">
        <h2 className="text-sm font-medium tracking-wide text-red-200/70 uppercase">
          {operation} — reverted on-chain
        </h2>
        <p className="mt-3 text-sm text-white/70">{revertedBody}</p>
        <p className="mt-2">{voyager}</p>
        {back}
      </section>
    );
  }
  if (outcome.kind === "failed") {
    return (
      <section className="rounded-xl border border-red-400/25 bg-red-400/[0.05] p-6">
        <h2 className="text-sm font-medium tracking-wide text-red-200/70 uppercase">
          {operation} — transaction failed
        </h2>
        <p className="mt-3 text-sm text-white/70">
          The network reported this transaction won&apos;t land:{" "}
          <code className="text-xs">{outcome.message}</code>
        </p>
        <p className="mt-2">{voyager}</p>
        {back}
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-white/15 bg-white/[0.03] p-6">
      <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
        {operation} — submitted, status unknown
      </h2>
      <p className="mt-3 text-sm text-white/70">
        The wait timed out before a receipt arrived. That is not a failure —
        check the explorer before assuming either way, and do not resubmit
        until the explorer answers.
      </p>
      <p className="mt-2">{voyager}</p>
      {back}
    </section>
  );
}
