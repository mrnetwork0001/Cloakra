"use client";

import { useCallback, useEffect, useState } from "react";
import type { WalletAccountV6 } from "starknet";
import {
  buildShield,
  executeStrk20,
  formatTokenAmount,
  formatTokenAmountExact,
  parseTokenAmount,
  sameFelt,
  walletErrorKind,
  walletErrorMessage,
  type PanelPhase,
} from "@/lib/strk20";
import { getPoolFee, getPublicStrkBalance } from "@/lib/pool";
import { usePoolFee } from "@/lib/hooks";
import { COPY } from "@/lib/copy";
import TxOutcome from "./TxOutcome";

/** Kept aside for gas on Max — wallet flows sponsor gas for pool ops, but the
 * ERC-20 approve leg may not be covered on every build. */
const GAS_RESERVE = 10n ** 18n; // 1 STRK

export default function ShieldPanel({
  account,
  address,
  disabled = false,
}: {
  account: WalletAccountV6;
  address: string;
  disabled?: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);
  const [phase, setPhase] = useState<PanelPhase>({ kind: "form" });
  const fee = usePoolFee(phase.kind === "form" || phase.kind === "error");

  // Public balance over our own RPC — no wallet involvement, no consent
  // needed. Refreshes when the form is (re)shown; keeps last good on failure.
  useEffect(() => {
    if (phase.kind !== "form" && phase.kind !== "error") return;
    let stale = false;
    getPublicStrkBalance(address)
      .then((b) => !stale && setPublicBalance(b))
      .catch(() => {
        /* keep last good value */
      });
    return () => {
      stale = true;
    };
  }, [address, phase.kind]);

  // Max re-reads balance and fee at click time — the mounted values can be
  // stale (e.g. right after a shield settles).
  const onMax = useCallback(async () => {
    try {
      const [freshBalance, freshFee] = await Promise.all([
        getPublicStrkBalance(address),
        getPoolFee(),
      ]);
      setPublicBalance(freshBalance);
      // Fee semantics verified on mainnet (TX #1): the pool fee is deducted
      // FROM the deposited amount (26 in → 20 shielded), so Max only reserves
      // gas. The deposit must still exceed the fee to net anything.
      const max = freshBalance - GAS_RESERVE;
      if (max <= freshFee) {
        setPhase({
          kind: "error",
          message: `Balance (minus a 1 STRK gas reserve) wouldn't exceed the ${formatTokenAmount(freshFee)} STRK pool fee — nothing would be shielded.`,
        });
        return;
      }
      setPhase({ kind: "form" });
      setAmount(formatTokenAmountExact(max));
    } catch {
      setPhase({ kind: "error", message: "Could not read balance/fee — try again." });
    }
  }, [address]);

  const onShield = useCallback(async () => {
    // The wallet can switch accounts under us; never sign for a different
    // account than the one this form was validated against.
    if (!sameFelt(account.address, address)) {
      setPhase({ kind: "error", message: COPY.accountChanged });
      return;
    }
    let raw: bigint;
    try {
      raw = parseTokenAmount(amount);
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message });
      return;
    }

    // Re-read the fee at signing time; the mounted value may be stale and the
    // pool can change it (it moved 4 → 6 STRK mid-August).
    let freshFee: bigint;
    let freshBalance: bigint;
    try {
      [freshFee, freshBalance] = await Promise.all([
        getPoolFee(),
        getPublicStrkBalance(address),
      ]);
    } catch {
      setPhase({ kind: "error", message: "Could not read the pool fee — try again." });
      return;
    }
    if (fee !== null && freshFee !== fee) {
      setPhase({
        kind: "error",
        message: `The pool fee changed to ${formatTokenAmount(freshFee)} STRK — review and press Shield again.`,
      });
      return;
    }
    setPublicBalance(freshBalance);
    if (raw > freshBalance) {
      setPhase({
        kind: "error",
        message: "Amount exceeds your public balance.",
      });
      return;
    }
    if (raw <= freshFee) {
      setPhase({
        kind: "error",
        message: `The ${formatTokenAmount(freshFee)} STRK pool fee is deducted from the deposit — shield more than the fee or nothing arrives.`,
      });
      return;
    }

    setPhase({ kind: "submitting" });
    try {
      const outcome = await executeStrk20(account, [buildShield(raw)], "Shield");
      setPhase({ kind: "done", outcome });
    } catch (err) {
      const kind = walletErrorKind(err);
      setPhase({
        kind: "error",
        message:
          kind === "refused"
            ? "Declined in the wallet. If you had already signed the first (STRK approval) step, that approval to the pool may remain — it can only ever be spent by a deposit you sign yourself."
            : kind === "not_registered"
              ? "This account isn't registered in the pool yet, and Ready won't register it as part of a dapp-initiated deposit. Open the Ready extension, activate the private balance for this account (it signs a one-time registration), then shield here again."
              : `Shield failed: ${walletErrorMessage(err)}`,
      });
    }
  }, [account, address, amount, fee]);

  if (phase.kind === "done") {
    return (
      <TxOutcome
        outcome={phase.outcome}
        operation="Shield"
        confirmedTitle="Shielded"
        confirmedBody={`Deposit confirmed on mainnet — execution succeeded. This account is now registered in the pool. ${COPY.noteMaturity}`}
        revertedBody="The deposit was included but reverted — no STRK entered the pool. Possible causes: a fee change between quote and execution, or insufficient public balance at execution."
        onBack={() => {
          setAmount("");
          setPhase({ kind: "form" });
        }}
      />
    );
  }

  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/[0.02] p-6 ${disabled ? "opacity-60" : ""}`}
    >
      <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
        Shield STRK
      </h2>
      <p className="mt-2 text-sm text-white/50">
        Moves STRK from your public balance into the pool as an encrypted note.
        This deposit — your address and amount — is the public leg.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount in STRK"
          disabled={disabled || phase.kind === "submitting"}
          className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onMax}
          disabled={disabled || phase.kind === "submitting"}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-40"
        >
          Max
        </button>
      </div>

      <dl className="mt-3 space-y-1 text-sm text-white/50">
        <div className="flex justify-between">
          <dt>Public balance</dt>
          <dd>
            {publicBalance !== null ? `${formatTokenAmount(publicBalance)} STRK` : "…"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Pool fee (deducted from the deposit)</dt>
          <dd>{fee !== null ? `${formatTokenAmount(fee)} STRK` : "…"}</dd>
        </div>
        {(() => {
          if (fee === null) return null;
          try {
            const net = parseTokenAmount(amount) - fee;
            return net > 0n ? (
              <div className="flex justify-between">
                <dt>You receive shielded</dt>
                <dd className="text-white/80">≈ {formatTokenAmount(net)} STRK</dd>
              </div>
            ) : null;
          } catch {
            return null;
          }
        })()}
      </dl>

      <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
        Ready will ask you to sign <strong>twice</strong>: first the STRK
        approval, then the private deposit. The second prompt is part of the
        same flow, not a duplicate. Ready shows the exact total before you sign.
      </p>

      {phase.kind === "error" ? (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {phase.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onShield}
        disabled={disabled || phase.kind === "submitting" || !amount.trim()}
        className="mt-4 w-full rounded-lg border border-white/20 bg-white/[0.05] px-4 py-2.5 font-medium text-white transition hover:border-white/40 hover:bg-white/[0.08] disabled:opacity-50"
      >
        {phase.kind === "submitting" ? "Waiting for wallet…" : "Shield"}
      </button>
    </section>
  );
}
