import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { RPC_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Cloakra — App",
  description:
    "Shield, split, pay, and unshield STRK through the STRK20 privacy pool on Starknet mainnet.",
};

export default function AppPage() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 text-white">
            <svg viewBox="0 0 32 32" className="size-6 text-white" aria-hidden>
              <path
                d="M16 5l9 3.5v7c0 5.5-3.8 9.6-9 11.5-5.2-1.9-9-6-9-11.5v-7L16 5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="15.5" r="3.2" fill="currentColor" />
            </svg>
            <span className="font-semibold tracking-tight">Cloakra</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-white/50 underline-offset-4 transition hover:text-white hover:underline"
          >
            ← About Cloakra
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-8 text-sm text-white/50">
          Connect a privacy-enabled wallet (Ready) on Starknet mainnet.
          Everything here signs through your wallet — Cloakra holds no keys and
          reads no balances without your consent.
        </p>

        {!RPC_URL ? (
          <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            No RPC configured. Copy <code>client/.env.local.example</code> to{" "}
            <code>client/.env.local</code> and add an Alchemy key.
          </p>
        ) : null}

        <AppShell />

        <footer className="mt-16 border-t border-white/10 pt-6 text-sm text-white/30">
          Apache 2.0 · Built for the STRK20 Private Sprint
        </footer>
      </main>
    </>
  );
}
