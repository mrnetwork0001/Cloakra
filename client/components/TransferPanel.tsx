"use client";

import { useCallback, useState } from "react";
import type { WalletAccountV6 } from "starknet";
import {
  buildTransfer,
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

/** GhostBounty's primitive: a single private transfer inside the pool. */
export default function TransferPanel({
  account,
  address,
  disabled = false,
  title = "Private transfer",
  description = "Sends shielded STRK to another registered account. The transaction itself is public, but sender, recipient, and amount are unreadable.",
}: {
  account: WalletAccountV6;
  address: string;
  disabled?: boolean;
  /** Module framing — GhostBounty reuses these same rails. */
  title?: string;
  description?: string;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<PanelPhase>({ kind: "form" });
  const fee = usePoolFee(phase.kind === "form" || phase.kind === "error");

  const onBack = useCallback(() => {
    // Clear the form: a pre-filled, enabled form after a submission is a
    // double-payment invitation.
    setRecipient("");
    setAmount("");
    setPhase({ kind: "form" });
  }, []);

  const onSend = useCallback(async () => {
    // The wallet can switch accounts under us; never sign for a different
    // account than the one this form was validated against.
    if (!sameFelt(account.address, address)) {
      setPhase({ kind: "error", message: COPY.accountChanged });
      return;
    }
    let to: string;
    let raw: bigint;
    try {
      to = parseAddress(recipient);
      if (sameFelt(to, address)) {
        throw new Error("That's your own address — pick the recipient's.");
      }
      raw = parseTokenAmount(amount);
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message });
      return;
    }

    setPhase({ kind: "submitting" });
    try {
      const outcome = await executeStrk20(account, [buildTransfer(to, raw)], title);
      setPhase({ kind: "done", outcome });
    } catch (err) {
      const kind = walletErrorKind(err);
      setPhase({
        kind: "error",
        message:
          kind === "refused"
            ? "Transfer declined in the wallet."
            : kind === "not_registered"
              ? "One side of this transfer isn't registered in the pool. Registration is the 'Enable private tokens' step inside Ready — run it there (dapp-initiated operations can't trigger it); the recipient must have done the same in their own wallet."
              : kind === "insufficient_private"
                ? "Not enough shielded balance — remember the pool fee, and freshly shielded notes mature ~10 blocks before they can be spent."
                : `Transfer failed: ${walletErrorMessage(err)}`,
      });
    }
  }, [account, address, recipient, amount]);

  if (phase.kind === "done") {
    return (
      <TxOutcome
        outcome={phase.outcome}
        operation={title}
        confirmedTitle="Sent privately"
        confirmedBody="Transfer confirmed — execution succeeded. Inside the pool, sender, recipient, and amount stay private."
        revertedBody="The transfer was included but reverted — no value moved. Possible causes: immature notes (~10 blocks), insufficient shielded balance at execution, or a fee change."
        onBack={onBack}
      />
    );
  }

  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/[0.02] p-6 ${disabled ? "opacity-60" : ""}`}
    >
      <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
        {title}
      </h2>
      <p className="mt-2 text-sm text-white/50">{description}</p>

      <div className="mt-4 space-y-2">
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient address (0x…)"
          disabled={disabled || phase.kind === "submitting"}
          className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
        />
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

      <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
        {COPY.recipientPrereq} {COPY.noteMaturity}
      </p>

      {phase.kind === "error" ? (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {phase.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSend}
        disabled={
          disabled ||
          phase.kind === "submitting" ||
          !recipient.trim() ||
          !amount.trim()
        }
        className="mt-4 w-full rounded-lg border border-white/20 bg-white/[0.05] px-4 py-2.5 font-medium text-white transition hover:border-white/40 hover:bg-white/[0.08] disabled:opacity-50"
      >
        {phase.kind === "submitting" ? "Waiting for wallet…" : "Send privately"}
      </button>
    </section>
  );
}
