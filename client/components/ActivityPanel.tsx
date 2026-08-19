"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPublicFootprint, type FootprintEntry } from "@/lib/events";
import { formatTokenAmount, sameFelt } from "@/lib/strk20";
import { shorten, voyagerTx, STRK_TOKEN_ADDRESS } from "@/lib/config";

type State =
  | { kind: "loading" }
  | {
      kind: "loaded";
      entries: FootprintEntry[];
      truncated: boolean;
      skipped: number;
    }
  | { kind: "error" };

/**
 * The account's public footprint — everything a block explorer can see about
 * its pool use, and nothing more. Reads pool events over our own RPC (public
 * data; no wallet involvement). The demo moment: deposits and withdrawals
 * are here; the splits and transfers between them are nowhere.
 */
export default function ActivityPanel({ address }: { address: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(() => {
    setState({ kind: "loading" });
    fetchPublicFootprint(address)
      .then(({ entries, truncated, skipped }) =>
        setState({ kind: "loaded", entries, truncated, skipped }),
      )
      .catch(() => setState({ kind: "error" }));
  }, [address]);

  useEffect(load, [load]);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
          Public footprint
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={state.kind === "loading"}
          className="text-xs text-white/40 underline-offset-4 transition hover:text-white/70 hover:underline disabled:opacity-40"
        >
          Refresh
        </button>
      </div>
      <p className="mt-2 text-sm text-white/50">
        Everything the chain shows about this account&apos;s pool use — the
        public ERC-20 legs. Private transfers and splits never appear here.
      </p>

      <div className="mt-4">
        {state.kind === "loading" ? (
          <p className="text-sm text-white/40">Reading pool events…</p>
        ) : state.kind === "error" ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            Could not read pool events — refresh to retry.
          </p>
        ) : state.entries.length === 0 ? (
          state.truncated ? (
            <p className="text-sm text-white/40">
              Couldn&apos;t scan the full window before the page limit — refresh
              to continue. No entries found so far.
            </p>
          ) : (
            <p className="text-sm text-white/40">
              No public pool legs yet. After your first shield, the deposit will
              show up here — and only the deposit.
            </p>
          )
        ) : (
          <ul className="space-y-px overflow-hidden rounded-lg border border-white/10">
            {state.entries.map((entry, i) => (
              <li
                // One tx can legally carry several same-kind events (batch
                // deposits) — include the position for a collision-free key.
                key={`${entry.txHash}-${entry.kind}-${i}`}
                className="flex items-center justify-between gap-3 bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white">
                    {entry.kind === "deposit" ? "Shield (deposit)" : "Unshield (withdrawal)"}
                    <span className="ml-2 text-white/50">
                      {formatTokenAmount(entry.amount)}{" "}
                      {sameFelt(entry.token, STRK_TOKEN_ADDRESS) ? "STRK" : shorten(entry.token)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-white/35">
                    {entry.blockNumber === null ? "pending" : `block ${entry.blockNumber}`}
                  </p>
                </div>
                <a
                  className="shrink-0 text-xs text-white/50 underline underline-offset-4 hover:text-white"
                  href={voyagerTx(entry.txHash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shorten(entry.txHash, 10, 4)}
                </a>
              </li>
            ))}
          </ul>
        )}
        {state.kind === "loaded" && state.truncated ? (
          <p className="mt-2 text-xs text-white/35">
            Newest entries shown — the scan budget ran out before reaching the
            oldest history.
          </p>
        ) : null}
        {state.kind === "loaded" && state.skipped > 0 ? (
          <p className="mt-2 text-xs text-white/35">
            {state.skipped} entr{state.skipped === 1 ? "y" : "ies"} omitted:
            unrecognized event layout (pool upgrade?) — amounts would not be
            trustworthy.
          </p>
        ) : null}
      </div>
    </section>
  );
}
