"use client";

import { useCallback, useState } from "react";
import type { WalletAccountV6 } from "starknet";
import {
  buildWithdraw,
  executeStrk20,
  formatTokenAmount,
  parseAddress,
  parseTokenAmount,
  sameFelt,
  walletErrorKind,
  walletErrorMessage,
  type PanelPhase,
} from "@/lib/strk20";
import { usePoolFee } from "@/lib/hooks";
import { COPY } from "@/lib/copy";
import TxOutcome from "./TxOutcome";

/** Unshield: private → public. The one flow whose output leg is public. */
export default function WithdrawPanel({
  account,
  address,
  disabled = false,
}: {
  account: WalletAccountV6;
  address: string;
  disabled?: boolean;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<PanelPhase>({ kind: "form" });
  const fee = usePoolFee(phase.kind === "form" || phase.kind === "error");

  const onBack = useCallback(() => {
    setRecipient("");
    setAmount("");
    setPhase({ kind: "form" });
  }, []);

  const onWithdraw = useCallback(async () => {
    if (!sameFelt(account.address, address)) {
      setPhase({ kind: "error", message: COPY.accountChanged });
      return;
    }
    let to: string;
    let raw: bigint;
    try {
      // Withdraw-to-self is the normal unshield; any public address is legal.
      to = parseAddress(recipient);
      raw = parseTokenAmount(amount);
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message });
      return;
    }

    setPhase({ kind: "submitting" });
    try {
      const outcome = await executeStrk20(account, [buildWithdraw(to, raw)], "Unshield");
      setPhase({ kind: "done", outcome });
    } catch (err) {
      const kind = walletErrorKind(err);
      setPhase({
        kind: "error",
        message:
          kind === "refused"
            ? "Withdrawal declined in the wallet."
            : kind === "insufficient_private"
              ? "Not enough shielded balance — remember the pool fee, and freshly shielded notes mature ~10 blocks."
              : kind === "not_registered"
                ? "This account isn't registered in the pool yet — there is no shielded balance to withdraw."
                : `Withdrawal failed: ${walletErrorMessage(err)}`,
      });
    }
  }, [account, address, recipient, amount]);

  if (phase.kind === "done") {
    return (
      <TxOutcome
        outcome={phase.outcome}
        operation="Unshield"
        confirmedTitle="Unshielded"
        confirmedBody="Withdrawal confirmed — execution succeeded. This leg is public: the recipient address and amount are visible on-chain. No on-chain record names the source balance — though timing and amount correlation with public deposits is always possible."
        revertedBody="The withdrawal was included but reverted — nothing left the pool. Possible causes: immature notes (~10 blocks), insufficient shielded balance at execution, or a fee change."
        onBack={onBack}
      />
    );
  }

  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/[0.02] p-6 ${disabled ? "opacity-60" : ""}`}
    >
      <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
        Unshield
      </h2>
      <p className="mt-2 text-sm text-white/50">
        Withdraws shielded STRK back to a public address.{" "}
        <strong className="text-white/70">This leg is public</strong> — the
        recipient and amount appear on-chain. No on-chain record names the
        depositing org, but timing and amounts are public too: unshielding a
        matching amount right after a shield is trivially correlatable.
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Public recipient (0x…)"
            disabled={disabled || phase.kind === "submitting"}
            className="w-full flex-1 rounded-lg border border-white/15 bg-transparent px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => {
              setRecipient(address);
              if (phase.kind === "error") setPhase({ kind: "form" });
            }}
            disabled={disabled || phase.kind === "submitting"}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-40"
          >
            Self
          </button>
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount in STRK"
          disabled={disabled || phase.kind === "submitting"}
          className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
        />
      </div>

      <dl className="mt-3 text-sm text-white/50">
        <div className="flex justify-between">
          <dt>Pool fee (re-checked in wallet)</dt>
          <dd>{fee !== null ? `${formatTokenAmount(fee)} STRK` : "…"}</dd>
        </div>
      </dl>

      {phase.kind === "error" ? (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {phase.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onWithdraw}
        disabled={
          disabled ||
          phase.kind === "submitting" ||
          !recipient.trim() ||
          !amount.trim()
        }
        className="mt-4 w-full rounded-lg border border-white/20 bg-white/[0.05] px-4 py-2.5 font-medium text-white transition hover:border-white/40 hover:bg-white/[0.08] disabled:opacity-50"
      >
        {phase.kind === "submitting" ? "Waiting for wallet…" : "Unshield"}
      </button>
    </section>
  );
}
