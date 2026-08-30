"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { verifyReceipt, type PayoutReceipt, type ReceiptVerification } from "@/lib/receipts";
import { formatTokenAmountExact } from "@/lib/strk20";
import { shorten, voyagerTx } from "@/lib/config";

type State =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "done"; receipt: PayoutReceipt; result: ReceiptVerification }
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

/**
 * Public receipt verification: pure math plus two public RPC reads. Verifies
 * the org's ATTESTATION - the shielded transfer itself is unverifiable by
 * design, and the page says so.
 */
export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const onVerify = useCallback(async () => {
    let receipt: PayoutReceipt;
    try {
      receipt = JSON.parse(input);
    } catch {
      setState({ kind: "error", message: "That isn't valid JSON - paste the whole receipt file." });
      return;
    }
    setState({ kind: "verifying" });
    try {
      const result = await verifyReceipt(receipt);
      setState({ kind: "done", receipt, result });
    } catch {
      setState({ kind: "error", message: "Verification crashed - is this a Cloakra receipt file?" });
    }
  }, [input]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-white/40 underline-offset-4 hover:text-white/70 hover:underline">
        ← Cloakra
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        Verify a payout receipt
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-white/50">
        Paste a <code>cloakra-receipt-v1</code> file. A receipt is the paying
        org&apos;s <strong className="text-white/70">signed attestation</strong>{" "}
        of who was paid what in which pool transaction. Verification proves the
        attestation - the commitment math, the org account&apos;s signature
        (checked onchain), and that the referenced transaction settled and
        touched the STRK20 pool. What it cannot prove is the shielded
        transfer&apos;s contents: the pool keeps those private by design, so a
        receipt is exactly as trustworthy as its signer.
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='{"format":"cloakra-receipt-v1", …}'
        rows={10}
        aria-label="Receipt JSON"
        className="mt-6 w-full rounded-lg border border-white/15 bg-transparent px-4 py-3 font-mono text-xs text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none"
      />
      <button
        type="button"
        onClick={onVerify}
        disabled={!input.trim() || state.kind === "verifying"}
        className="mt-3 rounded-lg border border-white/20 bg-white/[0.05] px-5 py-2.5 font-medium text-white transition hover:border-white/40 disabled:opacity-50"
      >
        {state.kind === "verifying" ? "Verifying…" : "Verify"}
      </button>

      {state.kind === "error" ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">
          {state.message}
        </p>
      ) : null}

      {state.kind === "done" ? (
        <div
          className={`mt-6 rounded-xl border p-5 ${
            state.result.ok
              ? "border-emerald-400/25 bg-emerald-400/[0.05]"
              : state.result.structure && state.result.merkle && state.result.signature === null
                ? "border-amber-400/25 bg-amber-400/[0.05]"
                : "border-red-400/25 bg-red-400/[0.05]"
          }`}
        >
          <p className="text-sm font-medium text-white">
            {state.result.ok
              ? "Attestation verifies - the signing account stands behind this receipt"
              : state.result.structure && state.result.merkle && state.result.signature === null
                ? "Inconclusive - the chain could not be reached for the signature check"
                : "Receipt does NOT verify"}
          </p>
          <ul className="mt-3 space-y-2">
            <Row ok={state.result.structure} label="Well-formed receipt" />
            <Row
              ok={state.result.merkle}
              label="Recipient + amount are inside the signed commitment"
            />
            <Row
              ok={state.result.signature}
              label={
                state.result.signature === null
                  ? "Org signature - could not reach the chain to check"
                  : "Org account signed this run (checked onchain)"
              }
            />
            <Row
              ok={
                state.result.transaction === "SUCCEEDED_POOL"
                  ? true
                  : state.result.transaction === "UNKNOWN"
                    ? null
                    : false
              }
              label={`Referenced transaction: ${TX_LABEL[state.result.transaction]}`}
            />
          </ul>
          {state.result.structure ? (
            <dl className="mt-4 space-y-1 border-t border-white/10 pt-3 text-xs text-white/50">
              <div className="flex justify-between gap-4">
                <dt>Operation</dt>
                <dd className="text-white/70">{state.receipt.operation}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Recipient</dt>
                <dd className="font-mono">{shorten(state.receipt.recipient, 12, 6)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Amount (derived from the signed value)</dt>
                <dd className="text-white/70">
                  {(() => {
                    try {
                      return `${formatTokenAmountExact(BigInt(state.receipt.amount))} STRK`;
                    } catch {
                      return "unreadable";
                    }
                  })()}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Org</dt>
                <dd className="font-mono">{shorten(state.receipt.org, 12, 6)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Settlement</dt>
                <dd>
                  <a
                    className="font-mono text-white/70 underline underline-offset-4 hover:text-white"
                    href={voyagerTx(state.receipt.txHash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shorten(state.receipt.txHash, 12, 6)}
                  </a>
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
