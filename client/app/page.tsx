import AppShell from "@/components/AppShell";
import { RPC_URL } from "@/lib/config";

const MODULES = [
  {
    name: "StealthSplit",
    status: "On mainnet rails",
    blurb:
      "One shielded balance split atomically into per-contributor balances. Co-workers cannot read each other's allocation.",
  },
  {
    name: "GhostBounty",
    status: "On mainnet rails",
    blurb:
      "Bounty payouts to a researcher's shielded balance, so disclosing a vulnerability does not deanonymize the wallet that gets paid.",
  },
  {
    name: "StealthGrant",
    status: "On mainnet rails",
    blurb:
      "Shielded grant disbursement over the same rails — the grantee list and per-project amounts stay inside the pool.",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <header>
        <p className="text-sm font-medium tracking-[0.2em] text-white/40 uppercase">
          Starknet Mainnet
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Cloakra
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-white/60">
          Shielded capital allocation. Grants, bounties, and contributor payouts
          settled through the STRK20 privacy pool — who receives and how much
          stays private. What stays public: the org&apos;s deposits into the
          pool, and any withdrawal back to a public wallet.
        </p>
      </header>

      <div className="mt-12">
        <AppShell />
      </div>

      {!RPC_URL ? (
        <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          No RPC configured. Copy <code>client/.env.local.example</code> to{" "}
          <code>client/.env.local</code> and add an Alchemy key.
        </p>
      ) : null}

      <section className="mt-16">
        <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
          Modules
        </h2>
        <ul className="mt-4 space-y-px overflow-hidden rounded-xl border border-white/10">
          {MODULES.map((module) => (
            <li key={module.name} className="bg-white/[0.02] p-5">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-medium text-white">{module.name}</h3>
                <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/40">
                  {module.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {module.blurb}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 border-t border-white/10 pt-6 text-sm text-white/30">
        Apache 2.0 · Built for the STRK20 Private Sprint
      </footer>
    </main>
  );
}
