import Link from "next/link";
import ProofPanel from "@/components/ProofPanel";
import LiveFee from "@/components/LiveFee";
import AuroraPanel from "@/components/AuroraPanel";

const MODULES = [
  {
    name: "StealthSplit",
    tag: "Team payouts",
    blurb:
      "One shielded balance split atomically into per-contributor balances. All transfers land or none do - and inside the pool, co-workers can't read each other's allocation.",
  },
  {
    name: "GhostBounty",
    tag: "Security research",
    blurb:
      "Bounty payouts land in the researcher's shielded balance - the payout transaction names no recipient, no amount, and nothing linking them to your program.",
  },
  {
    name: "StealthGrant",
    tag: "Grant rounds",
    blurb:
      "A whole grant round disbursed in one atomic transaction. Each grantee sees only their own award - the recipient list and per-grant amounts never appear on-chain. Only the org's total deposit is public.",
  },
] as const;

const PROBLEMS = [
  {
    title: "A bounty payout doxxes the researcher",
    text: "Pay a white-hat publicly and you've permanently linked their wallet - and often their identity - to the vulnerability they found.",
  },
  {
    title: "A team split publishes the salary table",
    text: "On a transparent chain, splitting a grant among contributors shows every teammate exactly what every other teammate makes.",
  },
  {
    title: "A grant round exposes every recipient",
    text: "Funding projects on-chain broadcasts your entire allocation strategy - who, how much, and when - to competitors and attackers alike.",
  },
] as const;

const STEPS = [
  {
    step: "Shield",
    text: "The org deposits STRK into the STRK20 pool. This leg is public - address and amount. From here on, activity inside the pool carries no readable link back to it.",
    variant: 0 as const,
  },
  {
    step: "Allocate privately",
    text: "Splits, bounties, and grants settle inside the pool as encrypted notes. Recipients, amounts, and the link to your org are unreadable - each recipient sees only their own balance.",
    variant: 1 as const,
  },
  {
    step: "Unshield when needed",
    text: "Recipients withdraw to a public address on their own schedule. The withdrawal is public; its link back to your deposit is not. Timing and amounts are visible, so patience is part of the privacy.",
    variant: 2 as const,
  },
] as const;

const FAQ = [
  {
    q: "Where do my funds actually sit?",
    a: "In the canonical STRK20 pool contract on Starknet mainnet, controlled exclusively by your wallet. Cloakra has no backend, holds no keys, and cannot move or see anything without your wallet's signature or consent prompt.",
  },
  {
    q: "What does a private operation cost?",
    a: "The pool charges a flat fee per private operation, and Cloakra reads it live from the contract - it was 6 STRK at last check, and it changed mid-sprint, which is exactly why nothing here hardcodes it. On shields the fee is deducted from the deposited amount.",
  },
  {
    q: "What stays public?",
    a: "Deposits into the pool (your address and amount), withdrawals out of it (recipient address and amount), and the fact plus timing of pool interactions. What's hidden is who received, how much, and the link between payer and payee. Every screen labels which side it touches.",
  },
  {
    q: "What do recipients need?",
    a: "A privacy-enabled wallet (Ready) with private tokens enabled - a one-time in-wallet registration whose flow deposits 6 STRK that the pool fee consumes. Dapp-initiated operations cannot trigger registration; the UI says so rather than failing cryptically.",
  },
  {
    q: "Can Cloakra read my shielded balance?",
    a: "Only through your wallet, only when you press the button, and only after the wallet's own consent prompt. Capability detection is a version query - the app never reads wallet data to feature-detect.",
  },
  {
    q: "Why should I believe any of this?",
    a: "Don't - verify. Three mainnet transaction hashes are recorded in strk20.json and re-verified against Starknet in your browser on this very page. A fabricated hash would render a red NOT FOUND. The repo's verify script additionally requires the transactions to have emitted STRK20 pool events.",
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

/** Hex-rain hero art: rows of dimming hex glyphs, pure text. */
function HexRain() {
  const rows = [
    "0x3f 0x9c 0xa2 0x17 0x5d 0xe8 0x41 0xb6 0x2a 0x7f",
    "0xd4 0x08 0x6b 0xf1 0x93 0x3c 0xe5 0x50 0xaa 0x1e",
    "0x72 0xc9 0x0f 0x84 0xb1 0x66 0x2d 0xfa 0x48 0x95",
    "0xe0 0x37 0x8c 0x53 0xd9 0x14 0xa7 0x6e 0xbb 0x02",
    "0x4a 0xf5 0x21 0xce 0x78 0x9d 0x30 0x8b 0x5f 0xc3",
    "0x86 0x1b 0xdd 0x64 0x0a 0xef 0x92 0x47 0xb8 0x25",
  ];
  return (
    <div
      aria-hidden
      className="pointer-events-none font-mono text-[11px] leading-6 tracking-widest whitespace-pre text-white/25 select-none [mask-image:linear-gradient(to_bottom,black,transparent)]"
    >
      {rows.join("\n")}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <a href="#" className="flex items-center gap-2 text-white">
            <ShieldMark className="size-6 text-white" />
            <span className="font-semibold tracking-tight">Cloakra</span>
          </a>
          <div className="hidden items-center gap-6 text-sm text-white/50 sm:flex">
            <a className="transition hover:text-white" href="#modules">Modules</a>
            <a className="transition hover:text-white" href="#how">How it works</a>
            <a className="transition hover:text-white" href="#proof">Proof</a>
            <a className="transition hover:text-white" href="#faq">FAQ</a>
          </div>
          <Link
            className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition hover:bg-white/90"
            href="/app"
          >
            Open the app
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 md:px-10">
        {/* Hero */}
        <section className="grid items-center gap-12 py-24 sm:py-32 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1 className="max-w-2xl text-6xl font-semibold tracking-tight text-white sm:text-7xl">
              Pay the team.
              <br />
              Publish no salary table.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
              Cloakra is a shielded capital-allocation desk for organizations on
              Starknet. Grants, bug bounties, and contributor payouts settle
              through the STRK20 privacy pool - who receives and how much stays
              private, while the public legs stay honestly, verifiably public.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="rounded-full bg-white px-6 py-2.5 font-medium text-black transition hover:bg-white/90"
              >
                Open the app
              </Link>
              <a
                href="#proof"
                className="rounded-full border border-white/20 px-6 py-2.5 font-medium text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Verify the mainnet proof
              </a>
            </div>
            <LiveFee />
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-50 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-white/90" />
                </span>
                Live on Starknet Mainnet
              </p>
              <div className="mt-4">
                <HexRain />
              </div>
            </div>
          </div>
        </section>

        {/* Stat chip strip (the reference's logo-bar slot) */}
        <section className="border-t border-white/10 py-6">
          <ul className="flex flex-wrap items-center gap-3 text-sm text-white/50">
            {[
              "3 verified mainnet txs",
              "0 custom contracts - pure pool rails",
              "100% wallet-signed; no server keys",
              "30 tests on the money path",
            ].map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-white/10 bg-neutral-950 px-4 py-1.5"
              >
                {chip}
              </li>
            ))}
          </ul>
        </section>

        {/* Lifecycle as alternating feature rows */}
        <section id="how" className="scroll-mt-20 border-t border-white/10 py-24">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Engineered for honest privacy
          </h2>
          <div className="mt-10 space-y-16">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className={`grid items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <p className="text-xs font-medium tracking-widest text-white/40 uppercase">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-medium text-white">{s.step}</h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/50">
                    {s.text}
                  </p>
                </div>
                <AuroraPanel variant={s.variant} className="h-56 lg:h-64" />
              </div>
            ))}
          </div>
        </section>

        {/* Modules */}
        <section id="modules" className="scroll-mt-20 border-t border-white/10 py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Three modules, one set of rails
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/50">
            Shield and unshield are hash-proven on mainnet (see the proof
            below); private transfers and the atomic split ride the same
            wallet API against the same pool. Every operation is signed by
            your own wallet, never by a server.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {MODULES.map((m, i) => (
              <div
                key={m.name}
                className="rounded-2xl border border-white/10 bg-neutral-950 p-5 transition hover:border-white/25"
              >
                <AuroraPanel variant={(i % 3) as 0 | 1 | 2} className="h-24" />
                <div className="mt-4 flex items-center justify-between">
                  <h3 className="font-medium text-white">{m.name}</h3>
                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/40">
                    {m.tag}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{m.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Problems - the reference's testimonial slot, honestly used */}
        <section className="border-t border-white/10 py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Every payout is a disclosure
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <h3 className="font-medium text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hidden vs visible */}
        <section className="border-t border-white/10 py-24">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            What&apos;s private, what isn&apos;t
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Cloakra never overclaims. The privacy is the broken link between
            deposits and withdrawals - not invisibility of the public legs.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-neutral-950 text-white/40">
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
        <section id="proof" className="scroll-mt-20 border-t border-white/10 py-24">
          <ProofPanel />
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-white/10 py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-2">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-white/10 bg-neutral-950 px-5 py-4"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-white/80 transition group-open:text-white [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-white/50">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-white/10 py-28 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Pay privately. Prove it honestly.
          </h2>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/app"
              className="rounded-full bg-white px-6 py-2.5 font-medium text-black transition hover:bg-white/90"
            >
              Open the app
            </Link>
            <a
              href="https://github.com/mrnetwork0001/Cloakra"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-6 py-2.5 font-medium text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Read the code
            </a>
          </div>
        </section>

        <footer className="border-t border-white/10 pt-8 pb-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm text-white/30">
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
          </div>
          <p
            aria-hidden
            className="pointer-events-none mt-6 overflow-hidden text-[18vw] leading-none font-semibold tracking-tighter whitespace-nowrap text-white/[0.04] select-none"
          >
            Cloakra
          </p>
        </footer>
      </main>
    </>
  );
}
