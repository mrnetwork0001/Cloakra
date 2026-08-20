"use client";

import { useState, useSyncExternalStore } from "react";
import type { WalletAccountV6 } from "starknet";
import {
  getServerSnapshot,
  getSubmissions,
  subscribeSubmissions,
} from "@/lib/submissions";
import { shorten, voyagerTx } from "@/lib/config";
import WalletPanel, { type WalletSession } from "./WalletPanel";
import ShieldPanel from "./ShieldPanel";
import TransferPanel from "./TransferPanel";
import SplitPanel from "./SplitPanel";
import WithdrawPanel from "./WithdrawPanel";
import ActivityPanel from "./ActivityPanel";

export type { WalletSession };

const TABS = ["StealthSplit", "GhostBounty", "StealthGrant", "Treasury"] as const;
type Tab = (typeof TABS)[number];

export default function AppShell() {
  const [session, setSession] = useState<{
    account: WalletAccountV6;
    address: string;
    strk20: boolean;
    wrongChain: boolean;
  } | null>(null);
  const [tab, setTab] = useState<Tab>("StealthSplit");

  // Survives panel remounts (tab or account switches mid-submit): the user's
  // only pointer to an in-flight or just-settled tx must never vanish.
  const submissions = useSyncExternalStore(
    subscribeSubmissions,
    getSubmissions,
    getServerSnapshot,
  );
  // While anything is signing or awaiting its receipt, freeze navigation and
  // submits — a remounted blank form mid-flight is a duplicate-payment trap.
  const busy = submissions.some(
    (s) => s.kind === "signing" || s.kind === "pending",
  );

  return (
    <div className="space-y-6">
      <WalletPanel onSession={setSession} />

      {submissions.map((s) => (
        <p
          key={s.id}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white/50"
        >
          {s.operation} ·{" "}
          {s.kind === "signing"
            ? "waiting for wallet signature"
            : s.kind === "pending"
              ? "awaiting receipt"
              : s.kind === "not_sent"
                ? "not sent (failed or declined before broadcast)"
                : s.kind}
          {s.txHash ? (
            <>
              {" · "}
              <a
                className="text-white/70 underline underline-offset-4 hover:text-white"
                href={voyagerTx(s.txHash)}
                target="_blank"
                rel="noreferrer"
              >
                {shorten(s.txHash, 12, 4)}
              </a>
            </>
          ) : null}
        </p>
      ))}

      {session?.strk20 && session.wrongChain ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Wallet is on the wrong network — switch to mainnet to use Cloakra.
        </p>
      ) : null}

      {session && session.strk20 ? (
        <div key={session.address} className="space-y-6">
          <nav
            role="tablist"
            aria-label="Cloakra modules"
            className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1"
          >
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                disabled={busy && tab !== t}
                title={
                  busy && tab !== t
                    ? "A submission is in flight — navigation unlocks when it settles."
                    : undefined
                }
                className={`shrink-0 rounded-lg px-4 py-2 text-sm transition disabled:opacity-40 ${
                  tab === t
                    ? "bg-white/10 font-medium text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          {tab === "StealthSplit" ? (
            <SplitPanel
              account={session.account}
              address={session.address}
              disabled={session.wrongChain || busy}
            />
          ) : null}

          {tab === "GhostBounty" ? (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
                  Researcher onboarding
                </h2>
                <p className="mt-2 text-sm text-white/50">
                  Before a payout can land, the researcher (from their own
                  wallet, on their own machine) needs to:
                </p>
                <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-white/60">
                  <li>
                    Install a privacy-enabled Starknet wallet —{" "}
                    <a
                      className="text-white/80 underline underline-offset-4 hover:text-white"
                      href="https://www.ready.co"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ready
                    </a>
                  </li>
                  <li>
                    Run &ldquo;Enable private tokens&rdquo; in the wallet — a
                    one-time registration. Note: Ready&apos;s flow deposits 6
                    STRK which the pool fee consumes, so the account needs a
                    little STRK first.
                  </li>
                  <li>Share their address with you — nothing else.</li>
                </ol>
                <p className="mt-3 text-xs text-white/40">
                  The payout below then reaches their shielded balance without
                  publicly linking their wallet to your bounty program.
                </p>
              </div>
              <TransferPanel
                account={session.account}
                address={session.address}
                disabled={session.wrongChain || busy}
                title="GhostBounty payout"
                description="Pays a security researcher into their shielded balance. Explorers see that a pool transaction happened — but not who was paid, not the amount, and nothing naming your program. Your deposits into the pool stay public, so shield well before paying, not right before."
              />
            </>
          ) : null}

          {tab === "StealthGrant" ? (
            <SplitPanel
              account={session.account}
              address={session.address}
              disabled={session.wrongChain || busy}
              title="StealthGrant round"
              description="Disburse a grant round to all recipients in one atomic transaction. Each grantee sees their own award land shielded, and no grantee can see anyone else's amount. Outsiders see your public deposits into the pool and that pool activity occurred — never who received, or how much."
            />
          ) : null}

          {tab === "Treasury" ? (
            <>
              <ShieldPanel
                account={session.account}
                address={session.address}
                disabled={session.wrongChain || busy}
              />
              <WithdrawPanel
                account={session.account}
                address={session.address}
                disabled={session.wrongChain || busy}
              />
              <ActivityPanel address={session.address} />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
