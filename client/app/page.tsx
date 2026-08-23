import Link from "next/link";
import ProofPanel from "@/components/ProofPanel";

const MODULES = [
  {
    name: "StealthSplit",
    tag: "Team payouts",
    blurb:
      "One shielded balance split atomically into per-contributor balances. All transfers land or none do — and co-workers cannot read each other's allocation.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 12h6M14 5l6 3.5M14 12h6M14 19l6-3.5" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="20" cy="6" r="2" />
        <circle cx="20" cy="12" r="2" />
        <circle cx="20" cy="18" r="2" />
      </svg>
    ),
  },
  {
    name: "GhostBounty",
    tag: "Security research",
    blurb:
      "Bounty payouts to a researcher's shielded balance — disclosing a vulnerability no longer deanonymizes the wallet that gets paid for it.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3l7 2.8v5.4c0 4.3-3 7.5-7 9-4-1.5-7-4.7-7-9V5.8L12 3z" />
        <path d="M9.5 12l1.8 1.8 3.4-3.6" />
      </svg>
    ),
  },
  {
    name: "StealthGrant",
    tag: "Grant rounds",
    blurb:
      "A whole grant round disbursed in one atomic transaction. Each grantee sees their own award; nobody sees the list or the amounts.",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="9" width="16" height="11" rx="2" />
        <path d="M4 13h16M12 9v11M8.5 6.5C7 5 8 3 9.5 3c1.6 0 2.5 1.8 2.5 3.5C12 4.8 12.9 3 14.5 3 16 3 17 5 15.5 6.5c-.8.8-2.3 1.3-3.5 1.5-1.2-.2-2.7-.7-3.5-1.5z" />
      </svg>
    ),
  },
] as const;

const PROBLEMS = [
  {
    title: "A bounty payout doxxes the researcher",
    text: "Pay a white-hat publicly and you've permanently linked their wallet — and often their identity — to the vulnerability they found.",
  },
  {
    title: "A team split publishes the salary table",
    text: "On a transparent chain, splitting a grant among contributors shows every teammate exactly what every other teammate makes.",
  },
  {
    title: "A grant round exposes every recipient",
    text: "Funding projects on-chain broadcasts your entire allocation strategy — who, how much, and when — to competitors and attackers alike.",
  },
] as const;

const STEPS = [
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
] as const;

function ShieldMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        d="M16 5l9 3.5v7c0 5.5-3.8 9.6-9 11.5-5.2-1.9-9-6-9-11.5v-7L16 5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="15.5" r="3.2" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <a href="#top" className="flex items-center gap-2 text-white">
            <ShieldMark className="size-6 text-emerald-400" />
            <span className="font-semibold tracking-tight">Cloakra</span>
          </a>
          <div className="flex items-center gap-5 text-sm text-white/50">
            <a className="hidden transition hover:text-white sm:block" href="#modules">Modules</a>
            <a className="hidden transition hover:text-white sm:block" href="#how">How it works</a>
            <a className="hidden transition hover:text-white sm:block" href="#proof">Proof</a>
            <Link
              className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80 transition hover:border-white/30 hover:text-white"
              href="/app"
            >
              Open the app
            </Link>
          </div>
        </nav>
      </header>

      <main id="top" className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="relative py-20 sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-96 max-w-3xl rounded-full bg-emerald-500/[0.07] blur-3xl"
          />
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-xs font-medium text-emerald-200/80">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Live on Starknet Mainnet · STRK20 Privacy Pool
          </p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Pay the team.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-white bg-clip-text text-transparent">
              Publish nothing.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
            Cloakra is a shielded capital-allocation desk for organizations on
            Starknet. Grants, bug bounties, and contributor payouts settle
            through the STRK20 privacy pool — who receives and how much stays
            private, while the public legs stay honestly, verifiably public.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-lg bg-white px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-white/90"
            >
              Open the app
            </Link>
            <a
              href="#proof"
              className="rounded-lg border border-white/20 px-5 py-2.5 font-medium text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Verify the mainnet proof
            </a>
          </div>
          <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 sm:grid-cols-4">
            {[
              ["3", "verified mainnet txs"],
              ["0", "custom contracts — pure pool rails"],
              ["100%", "wallet-signed; no server keys"],
              ["26", "tests on the money path"],
            ].map(([n, label]) => (
              <div key={label} className="bg-white/[0.02] px-4 py-4">
                <dt className="order-last mt-1 text-xs text-white/40">{label}</dt>
                <dd className="text-2xl font-semibold text-white">{n}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Problem */}
        <section className="border-t border-white/10 py-16">
          <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
            Every payout is a disclosure
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className="font-medium text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Modules */}
        <section id="modules" className="scroll-mt-20 border-t border-white/10 py-16">
          <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
            Three modules, one set of verified rails
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Every module is a framing of the same mainnet-proven primitives —
            shield, private transfer, atomic split, unshield — signed by your
            own wallet, never by a server.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {MODULES.map((m) => (
              <div
                key={m.name}
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-emerald-400/25 hover:bg-emerald-400/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300/80">{m.icon}</span>
                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/40">
                    {m.tag}
                  </span>
                </div>
                <h3 className="mt-4 font-medium text-white">{m.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{m.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-white/10 py-16">
          <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
            How it works
          </h2>
          <ol className="relative mt-8 space-y-10 border-l border-white/10 pl-8">
            {STEPS.map((s, i) => (
              <li key={s.step} className="relative">
                <span className="absolute -left-[45px] flex size-8 items-center justify-center rounded-full border border-white/15 bg-neutral-950 text-sm text-emerald-300/90">
                  {i + 1}
                </span>
                <h3 className="font-medium text-white">{s.step}</h3>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Hidden vs visible */}
        <section className="border-t border-white/10 py-16">
          <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
            What&apos;s private, what isn&apos;t
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Cloakra never overclaims. The privacy is the broken link between
            deposits and withdrawals — not invisibility of the public legs.
          </p>
          <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
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
        </section>

        {/* Proof */}
        <section id="proof" className="scroll-mt-20 border-t border-white/10 pb-4 pt-16">
          <ProofPanel />
        </section>

        <footer className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-white/10 py-8 text-sm text-white/30">
          <span className="flex items-center gap-2">
            <ShieldMark className="size-4 text-white/30" />
            Cloakra · Apache 2.0 · Built for the STRK20 Private Sprint
          </span>
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
    </>
  );
}
