"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import type { WalletAccountV6 } from "starknet";
import { signRun, type PayoutReceipt } from "@/lib/receipts";
import {
  getRun,
  getRunServerSnapshot,
  markRunSigned,
  subscribeRun,
} from "@/lib/runs";
import { beginSubmission, updateSubmission } from "@/lib/submissions";
import { isUserRefusal, sameFelt } from "@/lib/strk20";
import { shorten, voyagerTx } from "@/lib/config";

type State =
  | { kind: "offer" }
  | { kind: "signing" }
  | { kind: "ready"; receipts: PayoutReceipt[] }
  | { kind: "error"; message: string };

function download(receipt: PayoutReceipt) {
  const blob = new Blob([JSON.stringify(receipt, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cloakra-receipt-${receipt.recipient.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Signed receipts for the last settled run. Lives OUTSIDE the tab/account
 * remount boundary — the run's recipient list is unrecoverable from the chain
 * (the settlement is shielded), so this offer must survive navigation. A
 * receipt is the org's signed ATTESTATION of who was paid what in which tx —
 * it is not, and cannot be, a chain-verified transfer record.
 */
export default function ReceiptsBlock({
  account,
  address,
}: {
  account: WalletAccountV6;
  address: string;
}) {
  const run = useSyncExternalStore(subscribeRun, getRun, getRunServerSnapshot);
  const [state, setState] = useState<State>({ kind: "offer" });

  const onSign = useCallback(async () => {
    if (!run) return;
    setState({ kind: "signing" });
    const submissionId = beginSubmission(`${run.operation} receipts`);
    try {
      const receipts = await signRun(
        account,
        run.operation,
        run.txHash,
        run.recipients,
        run.payer,
      );
      updateSubmission(submissionId, { kind: "signed" });
      markRunSigned();
      setState({ kind: "ready", receipts });
    } catch (err) {
      updateSubmission(submissionId, { kind: "not_sent" });
      setState({
        kind: "error",
        message: isUserRefusal(err)
          ? "Signature declined in the wallet — no receipts were created."
          : (err as Error).message || "Could not sign the run — try again.",
      });
    }
  }, [account, run]);

  if (!run) return null;
  // Only the paying account may attest; other connected accounts see nothing.
  if (!sameFelt(address, run.payer)) return null;

  if (state.kind === "ready") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-sm font-medium text-white/80">Signed receipts</p>
        <p className="mt-1 text-xs text-white/45">
          Hand each file only to its recipient — a receipt reveals that
          recipient&apos;s amount to whoever holds it, and nothing about anyone
          else. Anyone can check one at <code>/verify</code>.
        </p>
        <ul className="mt-3 space-y-1.5">
          {state.receipts.map((r) => (
            <li key={r.recipient} className="flex items-center justify-between gap-3">
              <code className="truncate text-xs text-white/60">
                {shorten(r.recipient, 10, 4)} · {r.amountDisplay}
              </code>
              <button
                type="button"
                onClick={() => download(r)}
                className="shrink-0 rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-sm font-medium text-white/80">
        {run.signed
          ? `Receipts for the last ${run.operation} were signed`
          : `Attest the last settled run (${run.operation})`}
      </p>
      <p className="mt-1 text-xs text-white/45">
        One wallet signature produces a receipt file per recipient — your
        signed statement of who was paid what in{" "}
        <a
          className="text-white/60 underline underline-offset-4 hover:text-white"
          href={voyagerTx(run.txHash)}
          target="_blank"
          rel="noreferrer"
        >
          {shorten(run.txHash, 10, 4)}
        </a>
        . A receipt proves the attestation, not the shielded transfer itself —
        the pool keeps transaction contents private by design. Off-chain and
        free. Available only in this session: the recipient list cannot be
        rebuilt from the chain, so a reload discards this offer.
      </p>
      {run.outcomeKind === "submitted" ? (
        <p className="mt-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200">
          This run&apos;s receipt didn&apos;t arrive before the wait timed out —
          confirm on Voyager that it SUCCEEDED before attesting to it.
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p className="mt-2 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs text-red-200">
          {state.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onSign}
        disabled={state.kind === "signing"}
        className="mt-3 rounded-lg border border-white/20 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:border-white/40 disabled:opacity-50"
      >
        {state.kind === "signing"
          ? "Waiting for wallet…"
          : run.signed
            ? "Sign again"
            : "Sign receipts (1 signature)"}
      </button>
    </div>
  );
}
