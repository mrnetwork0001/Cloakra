import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import SiteFooter from "@/components/SiteFooter";
import { RPC_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Cloakra - App",
  description:
    "Shield, split, pay, and unshield STRK through the STRK20 privacy pool on Starknet mainnet.",
};

export default function AppPage() {
  return (
    <>

      <main>
        {!RPC_URL ? (
          <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            No RPC configured. Copy <code>client/.env.local.example</code> to{" "}
            <code>client/.env.local</code> and add an Alchemy key.
          </p>
        ) : null}

        <AppShell />

      </main>

      <SiteFooter />
    </>
  );
}
