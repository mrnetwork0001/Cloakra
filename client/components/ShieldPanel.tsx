"use client";

import { useCallback, useEffect, useState } from "react";
import type { WalletAccountV6 } from "starknet";
import {
  buildShield,
  executeStrk20,
  formatTokenAmount,
  formatTokenAmountExact,
  parseTokenAmount,
  walletErrorKind,
  type SubmitOutcome,
} from "@/lib/strk20";
import { getPoolFee, getPublicStrkBalance } from "@/lib/pool";
import { voyagerTx } from "@/lib/config";

/** Kept aside for gas on Max — wallet flows sponsor gas for pool ops, but the
 * ERC-20 approve leg may not be covered on every build. */
const GAS_RESERVE = 10n ** 18n; // 1 STRK

type Phase =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "done"; outcome: SubmitOutcome }
  | { kind: "error"; message: string };

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
  const [fee, setFee] = useState<bigint | null>(null);
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

  // Public reads over our own RPC — no wallet involvement, no consent needed.
  // Re-runs on phase changes so returning from an outcome refreshes both.
  useEffect(() => {
    let stale = false;
    getPoolFee()
      .then((f) => !stale && setFee(f))
      .catch(() => !stale && setFee(null));
    getPublicStrkBalance(address)
      .then((b) => !stale && setPublicBalance(b))
      .catch(() => !stale && setPublicBalance(null));
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
      setFee(freshFee);
      const max = freshBalance - freshFee - GAS_RESERVE;
      if (max <= 0n) {
        setPhase({
          kind: "error",
          message: `Balance doesn't cover the ${formatTokenAmount(freshFee)} STRK pool fee plus a 1 STRK gas reserve.`,
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
      setFee(freshFee);
      setPhase({
        kind: "error",
        message: `The pool fee changed to ${formatTokenAmount(freshFee)} STRK — review and press Shield again.`,
      });
      return;
    }
    setFee(freshFee);
    setPublicBalance(freshBalance);
    if (raw + freshFee > freshBalance) {
      setPhase({
        kind: "error",
        message: `Amount plus the ${formatTokenAmount(freshFee)} STRK pool fee exceeds your public balance.`,
      });
      return;
    }

    setPhase({ kind: "submitting" });
    try {
      const outcome = await executeStrk20(account, [buildShield(raw)]);
      setPhase({ kind: "done", outcome });
    } catch (err) {
      const kind = walletErrorKind(err);
      setPhase({
        kind: "error",
        message:
          kind === "refused"
            ? "Declined in the wallet. If you had already signed the first (STRK approval) step, that approval to the pool may remain — it can only ever be spent by a deposit you sign yourself."
            : `Shield failed: ${
                typeof err === "object" && err !== null && "message" in err
                  ? String((err as { message: unknown }).message)
                  : String(err)
              }`,
      });
    }
  }, [account, address, amount, fee]);

  if (phase.kind === "done") {
    const { outcome } = phase;
    const voyager = (
      <a
        className="text-sm text-white/80 underline underline-offset-4 hover:text-white"
        href={voyagerTx(outcome.txHash)}
        target="_blank"
        rel="noreferrer"
      >
        {outcome.txHash.slice(0, 18)}… on Voyager
      </a>
    );
    const back = (
      <button
        type="button"
        onClick={() => setPhase({ kind: "form" })}
        className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30"
      >
        Back
      </button>
    );

    if (outcome.kind === "confirmed") {
      return (
        <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-6">
          <h2 className="text-sm font-medium tracking-wide text-emerald-200/70 uppercase">
            Shielded
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Deposit confirmed on mainnet — execution succeeded. This account is
            now registered in the pool.
          </p>
          <p className="mt-2">{voyager}</p>
          <p className="mt-3 text-xs text-white/40">
            Freshly shielded notes mature for ~10 blocks before they can be spent.
          </p>
          {back}
        </section>
      );
    }
    if (outcome.kind === "reverted") {
      return (
        <section className="rounded-xl border border-red-400/25 bg-red-400/[0.05] p-6">
          <h2 className="text-sm font-medium tracking-wide text-red-200/70 uppercase">
            Deposit reverted
          </h2>
          <p className="mt-3 text-sm text-white/70">
            The transaction was included on-chain but <strong>reverted</strong> —
            no STRK entered the pool. This usually means a pool-side check
            failed (fee change, insufficient balance at execution).
          </p>
          <p className="mt-2">{voyager}</p>
          {back}
        </section>
      );
    }
    if (outcome.kind === "failed") {
      return (
        <section className="rounded-xl border border-red-400/25 bg-red-400/[0.05] p-6">
          <h2 className="text-sm font-medium tracking-wide text-red-200/70 uppercase">
            Transaction failed
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
          Submitted — status unknown
        </h2>
        <p className="mt-3 text-sm text-white/70">
          The wait timed out before a receipt arrived. That is not a failure —
          check the explorer before assuming either way.
        </p>
        <p className="mt-2">{voyager}</p>
        {back}
      </section>
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

      {disabled ? (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          Wallet is on the wrong network — switch to mainnet to shield.
        </p>
      ) : null}

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
          <dt>Pool fee (re-checked at signing)</dt>
          <dd>{fee !== null ? `${formatTokenAmount(fee)} STRK` : "…"}</dd>
        </div>
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
