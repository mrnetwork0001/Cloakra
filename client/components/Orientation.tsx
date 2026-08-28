/**
 * Shown while no wallet is connected. Most first-time visitors — reviewers
 * included — will not have a privacy-enabled wallet installed, and would
 * otherwise see a connect prompt and nothing else. This explains what each
 * tab does and, honestly, which parts need a wallet and which do not. It
 * shows no balances and fabricates no data.
 */
const TABS = [
  {
    name: "StealthSplit",
    text: "Pay a whole team from one shielded balance in a single atomic transaction — paste a CSV payroll or add rows by hand. Every recipient's amount stays inside the pool.",
  },
  {
    name: "GhostBounty",
    text: "A single private payout to a security researcher, with an onboarding checklist for what the recipient needs before they can be paid.",
  },
  {
    name: "StealthGrant",
    text: "The same atomic settlement framed for a grant round: many grantees, one transaction, no public recipient list.",
  },
  {
    name: "Treasury",
    text: "Shield STRK into the pool, unshield back out, and read your public footprint — every pool leg the chain can see about this account.",
  },
] as const;

export default function Orientation() {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
      <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
        What&apos;s in here
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-white/50">
        Connecting requires a privacy-enabled wallet on Starknet mainnet
        (Ready). Without one you can still read every claim this project
        makes — the mainnet proof on the landing page verifies itself against
        Starknet with no wallet involved.
      </p>

      <ul className="mt-5 space-y-px overflow-hidden rounded-xl border border-white/10">
        {TABS.map((t) => (
          <li key={t.name} className="bg-white/[0.02] px-4 py-3">
            <p className="text-sm font-medium text-white">{t.name}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/50">{t.text}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-white/35">
        Nothing here is simulated: with no wallet connected the app reads no
        balances and shows no numbers. Everything above is what the tabs do
        once a wallet is connected.
      </p>
    </section>
  );
}
