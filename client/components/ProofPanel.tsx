"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RpcError } from "starknet";
// Synced copy of the root strk20.json (see scripts/sync-strk20.mjs).
import strk20 from "@/lib/strk20.json";
import { getProvider } from "@/lib/pool";
import { shorten, voyagerTx } from "@/lib/config";

interface HashStatus {
  txHash: string;
  state: "checking" | "verified" | "unverified" | "not_found" | "error";
  finality?: string;
  execution?: string;
}

/**
 * Verifies the submission's own mainnet hashes live in the viewer's browser —
 * finality AND execution status straight from a Starknet node. The claim
 * "three mainnet transactions" is checked against the chain on every load,
 * not asserted by copy.
 */
export default function ProofPanel() {
  const [statuses, setStatuses] = useState<HashStatus[]>(() =>
    strk20.transactions.map((txHash) => ({ txHash, state: "checking" })),
  );
  // Latest-wins: StrictMode double-runs (and any future refresh) must not let
  // a superseded run's late failure overwrite a fresh verified row.
  const runRef = useRef(0);

  const check = useCallback(() => {
    const run = ++runRef.current;
    setStatuses(strk20.transactions.map((txHash) => ({ txHash, state: "checking" })));
    strk20.transactions.forEach((txHash, i) => {
      getProvider()
        .getTransactionStatus(txHash)
        .then((s) => {
          if (runRef.current !== run) return;
          const finality = String(s.finality_status ?? "");
          const execution = String(s.execution_status ?? "");
          const verified =
            (finality === "ACCEPTED_ON_L2" || finality === "ACCEPTED_ON_L1") &&
            execution === "SUCCEEDED";
          setStatuses((prev) =>
            prev.map((h, j) =>
              j === i
                ? {
                    txHash,
                    state: verified ? "verified" : "unverified",
                    finality,
                    execution,
                  }
                : h,
            ),
          );
        })
        .catch((err: unknown) => {
          if (runRef.current !== run) return;
          // A definitive "no such tx" from the node is the one failure this
          // panel exists to expose — never blur it into a network error.
          const notFound =
            err instanceof RpcError && err.isType("TXN_HASH_NOT_FOUND");
          setStatuses((prev) =>
            prev.map((h, j) =>
              j === i ? { txHash, state: notFound ? "not_found" : "error" } : h,
            ),
          );
        });
    });
  }, []);

  useEffect(check, [check]);

  if (strk20.transactions.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
        Submission proof
      </h2>
      <p className="mt-2 text-sm text-white/50">
        The mainnet transactions recorded in{" "}
        <code className="text-white/60">strk20.json</code> — verified against
        Starknet in your browser right now, not claimed.
      </p>
      <ul className="mt-4 space-y-px overflow-hidden rounded-xl border border-white/10">
        {statuses.map((h) => (
          <li
            key={h.txHash}
            className="flex items-center justify-between gap-3 bg-white/[0.02] px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`size-2 shrink-0 rounded-full ${
                  h.state === "verified"
                    ? "bg-emerald-400"
                    : h.state === "checking"
                      ? "bg-white/30"
                      : h.state === "not_found"
                        ? "bg-red-400"
                        : "bg-amber-400"
                }`}
              />
              <a
                className="truncate font-mono text-sm text-white/80 underline-offset-4 hover:text-white hover:underline"
                href={voyagerTx(h.txHash)}
                target="_blank"
                rel="noreferrer"
              >
                {shorten(h.txHash, 14, 6)}
              </a>
            </div>
            <span className="shrink-0 text-xs text-white/40">
              {h.state === "checking"
                ? "checking…"
                : h.state === "error"
                  ? "RPC unreachable"
                  : h.state === "not_found"
                    ? "NOT FOUND on mainnet"
                    : h.state === "verified"
                      ? `${h.finality} · ${h.execution}`
                      : `${h.finality || "?"} · ${h.execution || "?"}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
