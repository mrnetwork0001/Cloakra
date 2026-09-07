import Image from "next/image";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import ProofPanel from "@/components/ProofPanel";
import LiveFee from "@/components/LiveFee";
import {
  FlowDiagram,
  ShieldDiagram,
  SplitDiagram,
  UnshieldDiagram,
  ModuleGlyph,
} from "@/components/Diagrams";
import WindowFrame from "@/components/WindowFrame";
import MossVignette from "@/components/MossVignette";
import SiteFooter from "@/components/SiteFooter";

const MODULES = [
  {
    name: "StealthSplit",
    tag: "Team payouts",
    glyph: "split" as const,
    blurb:
      "One shielded balance split atomically into per-contributor balances. All transfers land or none do - and inside the pool, co-workers can't read each other's allocation.",
  },
  {
    name: "GhostBounty",
    tag: "Security research",
    glyph: "bounty" as const,
    blurb:
      "Bounty payouts land in the researcher's shielded balance - the payout transaction names no recipient, no amount, and nothing linking them to your program.",
  },
  {
    name: "StealthGrant",
    tag: "Grant rounds",
    glyph: "grant" as const,
    blurb:
      "A whole grant round disbursed in one atomic transaction. Each grantee sees only their own award - the recipient list and per-grant amounts never appear onchain. Only the org's total deposit is public.",
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
    text: "Funding projects onchain broadcasts your entire allocation strategy - who, how much, and when - to competitors and attackers alike.",
  },
] as const;

const STEPS = [
  {
    step: "Shield",
    text: "The org deposits STRK into the STRK20 pool. This leg is public - address and amount. From here on, activity inside the pool carries no readable link back to it.",
    art: "shield" as const,
  },
  {
    step: "Allocate privately",
    text: "Splits, bounties, and grants settle inside the pool as encrypted notes. Recipients, amounts, and the link to your org are unreadable - each recipient sees only their own balance.",
    art: "split" as const,
  },
  {
    step: "Unshield when needed",
    text: "Recipients withdraw to a public address on their own schedule. The withdrawal is public; its link back to your deposit is not. Timing and amounts are visible, so patience is part of the privacy.",
    art: "unshield" as const,
  },
] as const;

const PROPERTIES = [
  {
    title: "Runs in your browser",
    text: "No backend, no server keys. Every operation is signed by your own wallet, and Cloakra cannot read a shielded balance without the wallet's consent prompt.",
  },
  {
    title: "No custom contracts",
    text: "The pool's own batch call settles many transfers in one atomic transaction, so there is no bespoke Cairo to audit or trust - only the canonical STRK20 pool.",
  },
  {
    title: "Fees read live, never guessed",
    text: "The flat pool fee is read from the contract at render and re-checked at signing. It changed mid-sprint, which is exactly why nothing here hardcodes it.",
  },
  {
    title: "Proof, not promises",
    text: "The mainnet transactions in our submission file are re-verified against Starknet in your browser. A fabricated hash renders a red NOT FOUND.",
  },
  {
    title: "Receipts an auditor can total",
    text: "One signature per run commits every recipient and amount; each recipient gets only their own row. Drop a whole run on /verify and it verifies each row, totals what passes, and reports coverage.",
  },
  {
    title: "Honest on both ends",
    text: "Payers are warned when an amount echoes their own deposits. Recipients are warned when an unshield echoes another account's deposit, looks like an equal share of one, or lands in a quiet pool.",
  },
] as const;

const AUDIENCES = [
  { title: "DAOs & protocol treasuries", text: "Pay contributors without publishing the whole compensation table onchain." },
  { title: "Bug bounty programs", text: "Reward researchers without linking their wallet to the disclosure." },
  { title: "Grant programs", text: "Fund a full round in one transaction without exposing the grantee list." },
  { title: "Open-source maintainers", text: "Split sponsorship among maintainers without ranking them publicly." },
  { title: "Agencies & studios", text: "Settle contractor payouts without revealing rates to every other client." },
  { title: "Anyone paying a team", text: "The public legs stay public; who received what does not." },
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
    q: "How does an accountant audit a private payroll?",
    a: "With receipts. After a run settles, the paying account signs one statement committing to every recipient and amount; each recipient gets a file carrying only their own row. Drop a whole run's receipts on /verify and it verifies every row, checks the signature and settlement once, totals what passes, and reports coverage - receipts present against the count the org signed. It proves the attestation, never the shielded transfer itself.",
  },
  {
    q: "When is it safe for a recipient to unshield?",
    a: "Not right away, and not the exact row. Before an unshield opens the wallet, Cloakra reads the pool's recent public activity by every account and warns if the amount echoes another account's deposit, looks like an equal share of one, repeats your own earlier withdrawals, or lands in a quiet pool with a thin crowd. The pool's current crowd is shown on the dashboard so you can see it before you type an amount.",
  },
  {
    q: "Why should I believe any of this?",
    a: "Don't - verify. Three mainnet transaction hashes are recorded in strk20.json and re-verified against Starknet in your browser on this very page. A fabricated hash would render a red NOT FOUND. The repo's verify script additionally requires the transactions to have emitted STRK20 pool events.",
  },
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[11px] font-medium tracking-[0.25em] text-white/30 uppercase">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur">
        <nav className="mx-auto flex max-w-[calc(50vw+36rem)] items-center justify-between px-6 py-2 md:px-10">
          <a href="#" className="flex items-center" aria-label="Cloakra">
            <Image
              src="/cloakra-header.png"
              alt="Cloakra"
              width={1923}
              height={818}
              priority
              className="h-11 w-auto sm:h-16"
            />
          </a>
          <div className="hidden items-center gap-7 text-sm text-white/50 md:flex">
            <a className="transition hover:text-white" href="#how">How it works</a>
            <Link className="transition hover:text-white" href="/verify">Verify</Link>
            <a className="transition hover:text-white" href="#proof">Proof</a>
            <Link className="transition hover:text-white" href="/docs">Docs</Link>
          </div>
          <MobileNav />
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28">
          <MossVignette position="top" />
          <div
            aria-hidden
            className="anim-drift pointer-events-none absolute top-[-10%] left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
            style={{
              backgroundImage:
                "radial-gradient(closest-side, rgba(255,255,255,0.055), transparent)",
            }}
          />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Pay the team. Publish no salary table.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
              Shielded grants, bug bounties, and contributor payouts on Starknet.
              Who receives and how much stays private, while the public legs
              stay honestly, verifiably public.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                href="/app"
                className="rounded-full bg-white px-7 py-3 text-base font-medium text-black transition hover:bg-white/90"
              >
                Open the app
              </Link>
              <a
                href="#proof"
                className="rounded-full border border-white/25 px-7 py-3 text-base font-medium text-white/85 transition hover:border-white/45 hover:text-white"
              >
                Verify the mainnet proof
              </a>
            </div>
            <div className="mx-auto mt-6 max-w-xl">
              <LiveFee />
            </div>

            <div className="relative mx-auto mt-14 max-w-3xl">
              <WindowFrame>
                <div className="relative overflow-hidden rounded-lg bg-black/40 p-4">
                  <div
                    aria-hidden
                    className="anim-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"
                  />
                  <p className="mb-2 text-left text-[10px] tracking-[0.2em] text-white/25 uppercase">
                    shield → allocate privately → unshield
                  </p>
                  <div className="h-52 sm:h-64">
                    <FlowDiagram />
                  </div>
                </div>
              </WindowFrame>
            </div>
          </div>
        </section>

        {/* Big centered statement */}
        <section className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
          <p className="text-center text-2xl leading-relaxed font-medium text-white/85 sm:text-3xl">
            Cloakra settles organizational payouts inside the STRK20 privacy
            pool, so a bounty never doxxes the researcher and a team split never
            publishes the salary table - while every claim it makes stays
            checkable onchain.
          </p>
        </section>

        {/* Modules gallery */}
        <section id="modules" className="scroll-mt-20 px-6 py-16">
          <Eyebrow>Modules</Eyebrow>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white">
            Three modules, one set of rails
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-white/50">
            Shield and unshield are hash-proven on mainnet; private transfers
            and the atomic split ride the same wallet API against the same pool.
            Every operation is signed by your own wallet, never by a server.
          </p>
          <div className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-3">
            {MODULES.map((m, i) => (
              <div
                key={m.name}
                className="rounded-2xl border border-white/10 bg-neutral-950 p-4 transition hover:border-white/25"
              >
                <div className="h-28 rounded-xl border border-white/10 bg-black/40 p-2">
                  <ModuleGlyph kind={m.glyph} />
                </div>
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

        {/* Stacked lifecycle cards */}
        <section id="how" className="scroll-mt-20 px-6 py-16">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white">
            Shield once, allocate privately, unshield on your terms
          </h2>
          <div className="mx-auto mt-10 max-w-5xl space-y-4">
            {STEPS.map((step, i) => (
              <div
                key={step.step}
                className="grid items-center gap-6 rounded-2xl border border-white/10 bg-neutral-950 p-6 md:grid-cols-2 md:p-8"
              >
                <div>
                  <p className="text-[11px] font-medium tracking-[0.25em] text-white/30 uppercase">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-medium text-white">{step.step}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/50">{step.text}</p>
                </div>
                <WindowFrame>
                  <div className="h-44 rounded-lg bg-black/40 p-2">
                    {step.art === "shield" ? (
                      <ShieldDiagram />
                    ) : step.art === "split" ? (
                      <SplitDiagram />
                    ) : (
                      <UnshieldDiagram />
                    )}
                  </div>
                </WindowFrame>
              </div>
            ))}
          </div>
        </section>

        {/* Properties 2x2 */}
        <section className="px-6 py-16">
          <Eyebrow>Why it holds up</Eyebrow>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white">
            Privacy without the hand-waving
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
            {PROPERTIES.map((p) => (
              <div key={p.title} className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
                <h3 className="font-medium text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Problems (the reference's social-proof slot, used honestly) */}
        <section className="px-6 py-16">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white">
            Every payout is a disclosure
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
                <h3 className="font-medium text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Audiences 2x3 */}
        <section className="px-6 py-16">
          <Eyebrow>Who it's for</Eyebrow>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white">
            Built for organizations that pay people
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="rounded-xl border border-white/10 bg-neutral-950 p-5">
                <h3 className="text-sm font-medium text-white">{a.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/45">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hidden vs visible */}
        <section className="px-6 py-16">
          <Eyebrow>Full disclosure</Eyebrow>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white">
            What&apos;s private, what isn&apos;t
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/50">
            Cloakra never overclaims. The privacy is the broken link between
            deposits and withdrawals - not invisibility of the public legs.
          </p>
          <div className="mx-auto mt-8 max-w-4xl overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/40">
                  <th className="px-5 py-3 font-medium">Private (inside the pool)</th>
                  <th className="px-5 py-3 font-medium">Public (onchain)</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                {[
                  ["Who receives a split, bounty, or grant", "The org's deposits into the pool (address + amount)"],
                  ["Per-recipient amounts", "Any withdrawal to a public wallet (address + amount)"],
                  ["The link between payer and payee", "That an address interacted with the pool, and when"],
                ].map(([priv, pub]) => (
                  <tr key={priv} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3">{priv}</td>
                    <td className="px-5 py-3 text-white/45">{pub}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Proof (the reference's pricing slot) */}
        <section id="proof" className="scroll-mt-20 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <ProofPanel />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 px-6 py-16">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-white">
            Questions, answered
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

        {/* Final CTA over the vignette */}
        <section className="relative overflow-hidden px-6 pt-24 pb-28">
          <MossVignette position="bottom" />
          <div className="relative mx-auto max-w-2xl text-center">
            <Image
              src="/cloakra-header.png"
              alt="Cloakra"
              width={1923}
              height={818}
              className="mx-auto mb-10 h-24 w-auto"
            />
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Pay privately. Prove it honestly.
            </h2>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/app"
                className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Open the app
              </Link>
              <a
                href="https://github.com/mrnetwork0001/Cloakra"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Read the code
              </a>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
