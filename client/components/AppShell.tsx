"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { WalletAccountV6 } from "starknet";
import {
  getServerSnapshot,
  getSubmissions,
  subscribeSubmissions,
} from "@/lib/submissions";
import { shorten, voyagerTx } from "@/lib/config";
import WalletPanel, { type WalletSession } from "./WalletPanel";
import ReceiptsBlock from "./ReceiptsBlock";
import ShieldPanel from "./ShieldPanel";
import TransferPanel from "./TransferPanel";
import SplitPanel from "./SplitPanel";
import WithdrawPanel from "./WithdrawPanel";
import ActivityPanel from "./ActivityPanel";
import ShieldedBalance from "./ShieldedBalance";
import StatStrip from "./StatStrip";
import Orientation from "./Orientation";

export type { WalletSession };

const TABS = ["StealthSplit", "GhostBounty", "StealthGrant", "Treasury"] as const;
type Tab = (typeof TABS)[number];

const SECTIONS: Record<Tab, { title: string; blurb: string; icon: React.ReactNode }> = {
  StealthSplit: {
    title: "StealthSplit",
    blurb:
      "Pay a whole team from one shielded balance in a single atomic transaction. All transfers land or none do.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
        <path d="M4 12h5M13 6l6 0M13 12h6M13 18h6" />
        <circle cx="6" cy="12" r="1.8" />
      </svg>
    ),
  },
  GhostBounty: {
    title: "GhostBounty",
    blurb:
      "A single private payout to a security researcher - the transaction names no recipient and no amount.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
        <path d="M12 3.5l7 2.7v5.2c0 4.2-2.9 7.3-7 8.8-4.1-1.5-7-4.6-7-8.8V6.2z" />
      </svg>
    ),
  },
  StealthGrant: {
    title: "StealthGrant",
    blurb:
      "Disburse a whole grant round at once. Each grantee sees only their own award; the list never appears onchain.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <rect x="4" y="8" width="16" height="12" rx="2" />
        <path d="M4 12h16M12 8v12" />
      </svg>
    ),
  },
  Treasury: {
    title: "Treasury",
    blurb:
      "Shield STRK into the pool, unshield back out, and review every pool leg the chain can see about this account.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M4 9l8-4 8 4v2H4z" />
        <path d="M6 11v7M12 11v7M18 11v7M4 20h16" />
      </svg>
    ),
  },
};

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
  // submits - a remounted blank form mid-flight is a duplicate-payment trap.
  const busy = submissions.some(
    (s) => s.kind === "signing" || s.kind === "pending",
  );

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2 md:px-10">
          <Link href="/" className="flex items-center" aria-label="Cloakra home">
            <Image
              src="/cloakra-header.png"
              alt="Cloakra"
              width={1923}
              height={818}
              priority
              className="h-11 w-auto sm:h-16"
            />
          </Link>
          <div className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/docs"
              className="hidden font-mono text-xs tracking-[0.15em] text-white/45 uppercase transition hover:text-white sm:block"
            >
              Docs
            </Link>
            <WalletPanel onSession={setSession} />
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 md:px-10">

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
                : s.kind === "signed"
                  ? "signed (off-chain)"
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

      {session?.strk20 ? (
        <ReceiptsBlock account={session.account} address={session.address} />
      ) : null}

      {session?.strk20 && session.wrongChain ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Wallet is on the wrong network - switch to mainnet to use Cloakra.
        </p>
      ) : null}

      {!session || !session.strk20 ? <Orientation /> : null}

      {session && session.strk20 ? (
        <div key={session.address} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
            <nav
              role="tablist"
              aria-label="Cloakra modules"
              className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-neutral-950 p-2 lg:h-fit lg:flex-col lg:overflow-visible"
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
                      ? "A submission is in flight - navigation unlocks when it settles."
                      : undefined
                  }
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition disabled:opacity-40 ${
                    tab === t
                      ? "bg-white/10 font-medium text-white"
                      : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                  }`}
                >
                  <span className={tab === t ? "text-white" : "text-white/40"}>
                    {SECTIONS[t].icon}
                  </span>
                  {t}
                </button>
              ))}
            </nav>

            <div className="min-w-0 space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  {SECTIONS[tab].title}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/50">
                  {SECTIONS[tab].blurb}
                </p>
              </div>

              <StatStrip address={session.address} wrongChain={session.wrongChain} />

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
                    Install a privacy-enabled Starknet wallet -{" "}
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
                    Run &ldquo;Enable private tokens&rdquo; in the wallet - a
                    one-time registration. Note: Ready&apos;s flow deposits 6
                    STRK which the pool fee consumes, so the account needs a
                    little STRK first.
                  </li>
                  <li>Share their address with you - nothing else.</li>
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
                description="Pays a security researcher into their shielded balance. Explorers see that a pool transaction happened - but not who was paid, not the amount, and nothing naming your program. Your deposits into the pool stay public, so shield well before paying, not right before."
              />
            </>
          ) : null}

          {tab === "StealthGrant" ? (
            <SplitPanel
              account={session.account}
              address={session.address}
              disabled={session.wrongChain || busy}
              title="StealthGrant round"
              description="Disburse a grant round to all recipients in one atomic transaction. Each grantee sees their own award land shielded, and no grantee can see anyone else's amount. Outsiders see your public deposits into the pool and that pool activity occurred - never who received, or how much."
            />
          ) : null}

          {tab === "Treasury" ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
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
              </div>
              <ShieldedBalance key={session.address} account={session.account} />
              <ActivityPanel address={session.address} />
            </>
          ) : null}
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </>
  );
}
