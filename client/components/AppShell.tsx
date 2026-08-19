"use client";

import { useState, useSyncExternalStore } from "react";
import type { WalletAccountV6 } from "starknet";
import {
  getLastSubmission,
  getServerSnapshot,
  subscribeLastSubmission,
} from "@/lib/submissions";
import { shorten, voyagerTx } from "@/lib/config";
import WalletPanel, { type WalletSession } from "./WalletPanel";
import ShieldPanel from "./ShieldPanel";
import TransferPanel from "./TransferPanel";
import SplitPanel from "./SplitPanel";
import WithdrawPanel from "./WithdrawPanel";
import ActivityPanel from "./ActivityPanel";

export type { WalletSession };

export default function AppShell() {
  const [session, setSession] = useState<{
    account: WalletAccountV6;
    address: string;
    strk20: boolean;
    wrongChain: boolean;
  } | null>(null);

  // Survives panel remounts (e.g. account switch mid-submit): the user's only
  // pointer to an in-flight or just-settled tx must never vanish with a form.
  const lastSubmission = useSyncExternalStore(
    subscribeLastSubmission,
    getLastSubmission,
    getServerSnapshot,
  );

  return (
    <div className="space-y-6">
      <WalletPanel onSession={setSession} />
      {lastSubmission ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white/50">
          Last submission: {lastSubmission.operation} ·{" "}
          {lastSubmission.kind === "pending" ? "awaiting receipt" : lastSubmission.kind} ·{" "}
          <a
            className="text-white/70 underline underline-offset-4 hover:text-white"
            href={voyagerTx(lastSubmission.txHash)}
            target="_blank"
            rel="noreferrer"
          >
            {shorten(lastSubmission.txHash, 12, 4)}
          </a>
        </p>
      ) : null}
      {/* wrongChain disables the form INSIDE the panel rather than gating the
          mount — unmounting mid-submit would lose an in-flight tx outcome and
          invite a duplicate deposit. Only disconnect/account-change unmounts. */}
      {session?.strk20 && session.wrongChain ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Wallet is on the wrong network — switch to mainnet to use Cloakra.
        </p>
      ) : null}
      {session && session.strk20 ? (
        <div key={session.address} className="space-y-6">
          <ShieldPanel
            account={session.account}
            address={session.address}
            disabled={session.wrongChain}
          />
          <SplitPanel
            account={session.account}
            address={session.address}
            disabled={session.wrongChain}
          />
          <TransferPanel
            account={session.account}
            address={session.address}
            disabled={session.wrongChain}
          />
          <WithdrawPanel
            account={session.account}
            address={session.address}
            disabled={session.wrongChain}
          />
          <ActivityPanel address={session.address} />
        </div>
      ) : null}
    </div>
  );
}
