"use client";

import { useState } from "react";
import type { WalletAccountV6 } from "starknet";
import WalletPanel, { type WalletSession } from "./WalletPanel";
import ShieldPanel from "./ShieldPanel";

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
      {session && session.strk20 ? (
        <ShieldPanel
          key={session.address}
          account={session.account}
          address={session.address}
          disabled={session.wrongChain}
        />
      ) : null}
    </div>
  );
}
