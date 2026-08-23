import AppShell from "@/components/AppShell";
import ProofPanel from "@/components/ProofPanel";
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

      <section className="mt-16">
        <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
          How it works
        </h2>
        <ol className="mt-4 space-y-4">
          {[
            {
              step: "Shield",
              text: "The org deposits STRK into the STRK20 pool. This leg is public — address and amount — and it's the last thing anyone outside sees.",
            },
            {
              step: "Allocate privately",
              text: "Splits, bounties, and grants settle inside the pool as encrypted notes. Recipients, amounts, and the link to your org are unreadable — each recipient sees only their own balance.",
            },
            {
              step: "Unshield when needed",
              text: "Recipients withdraw to a public address on their own schedule. The withdrawal is public; its link back to your deposit is not. Timing and amounts are visible, so patience is part of the privacy.",
            },
          ].map((s, i) => (
            <li key={s.step} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm text-white/60">
                {i + 1}
              </span>
              <div>
                <h3 className="font-medium text-white">{s.step}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/50">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
          What&apos;s private, what isn&apos;t
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="px-4 py-3 font-medium">Private (inside the pool)</th>
                <th className="px-4 py-3 font-medium">Public (on-chain)</th>
              </tr>
            </thead>
            <tbody className="text-white/60">
              {[
                ["Who receives a split, bounty, or grant", "The org's deposits into the pool (address + amount)"],
                ["Per-recipient amounts", "Any withdrawal to a public wallet (address + amount)"],
                ["The link between payer and payee", "That an address interacted with the pool, and when"],
              ].map(([priv, pub]) => (
                <tr key={priv} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">{priv}</td>
                  <td className="px-4 py-3 text-white/45">{pub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-white/35">
          The privacy is the broken link between deposits and withdrawals — not
          invisibility of the public legs. Every screen in the app labels which
          side of this table it touches.
        </p>
      </section>

      <ProofPanel />

      <footer className="mt-16 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm text-white/30">
        <span>Apache 2.0 · Built for the STRK20 Private Sprint</span>
        <a
          className="text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
          href="https://github.com/mrnetwork0001/Cloakra"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a
          className="text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
          href="https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a"
          target="_blank"
          rel="noreferrer"
        >
          STRK20 pool
        </a>
      </footer>
    </main>
  );
}
