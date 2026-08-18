"use client";

import { useState } from "react";
import type { WalletAccountV6 } from "starknet";
import WalletPanel, { type WalletSession } from "./WalletPanel";
import ShieldPanel from "./ShieldPanel";
import TransferPanel from "./TransferPanel";
import SplitPanel from "./SplitPanel";

export type { WalletSession };

export default function AppShell() {
  const [session, setSession] = useState<{
    account: WalletAccountV6;
    address: string;
    strk20: boolean;
    wrongChain: boolean;
  } | null>(null);

  return (
    <div className="space-y-6">
      <WalletPanel onSession={setSession} />
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
        </div>
      ) : null}
    </div>
  );
}
