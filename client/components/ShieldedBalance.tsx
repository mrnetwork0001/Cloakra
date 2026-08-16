"use client";

import { useCallback, useState } from "react";
import type { WalletAccountV6 } from "starknet";
import {
  formatTokenAmount,
  isUserRefusal,
  readShieldedBalances,
  type ShieldedBalance as Balance,
} from "@/lib/strk20";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; balances: Balance[] }
  | { kind: "error"; message: string };

/**
 * User-triggered by design: reading shielded balances is consent-gated in the
 * wallet, so the request only ever starts from this button — never on mount.
 */
export default function ShieldedBalance({ account }: { account: WalletAccountV6 }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const onReveal = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const balances = await readShieldedBalances(account);
      setState({ kind: "loaded", balances });
    } catch (err) {
      setState({
        kind: "error",
        message: isUserRefusal(err)
          ? "Balance request declined in the wallet."
          : "Could not read shielded balance. Is this account registered in the pool?",
      });
    }
  }, [account]);

  if (state.kind === "loaded") {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-xs tracking-wide text-white/40 uppercase">Shielded balance</p>
        {state.balances.length === 0 ? (
          <p className="mt-1 text-sm text-white/50">No shielded notes yet.</p>
        ) : (
          state.balances.map((b) => (
            <p key={b.token} className="mt-1 text-xl text-white">
              {formatTokenAmount(b.raw)} <span className="text-white/40">STRK</span>
            </p>
          ))
        )}
        <p className="mt-1 text-xs text-white/30">
          Visible only to you — shared by your wallet with your consent.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onReveal}
        disabled={state.kind === "loading"}
        className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-50"
      >
        {state.kind === "loading" ? "Waiting for wallet…" : "Show shielded balance"}
      </button>
      <p className="text-xs text-white/30">
        Your wallet will ask before sharing — the app never reads this on its own.
      </p>
      {state.kind === "error" ? (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
