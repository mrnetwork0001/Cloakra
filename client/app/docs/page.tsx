import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Cloakra - Docs",
  description:
    "How Cloakra settles organizational payouts through the STRK20 privacy pool on Starknet mainnet: the modules, the privacy model, signed receipts, fees, and the limits.",
};

const POOL = "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";
const REPO = "https://github.com/mrnetwork0001/Cloakra";

const NAV = [
  {
    group: "Getting started",
    items: [
      { id: "welcome", label: "Welcome to Cloakra" },
      { id: "how", label: "How it works" },
      { id: "wallet", label: "Set up a wallet" },
    ],
  },
  {
    group: "Modules",
    items: [
      { id: "stealthsplit", label: "StealthSplit" },
      { id: "ghostbounty", label: "GhostBounty" },
      { id: "stealthgrant", label: "StealthGrant" },
      { id: "treasury", label: "Treasury" },
    ],
  },
  {
    group: "Privacy",
    items: [
      { id: "model", label: "What's private" },
      { id: "warnings", label: "Privacy warnings" },
      { id: "unshield", label: "Safe to unshield?" },
    ],
  },
  {
    group: "Receipts",
    items: [
      { id: "receipts", label: "Signed receipts" },
      { id: "verifying", label: "Verifying a receipt" },
      { id: "auditing", label: "Auditing a run" },
    ],
  },
  {
    group: "Protocol",
    items: [
      { id: "fees", label: "Fees & registration" },
      { id: "mainnet", label: "Mainnet transactions" },
    ],
  },
  {
    group: "Trust",
    items: [
      { id: "architecture", label: "Architecture" },
      { id: "limits", label: "Known limits" },
    ],
  },
] as const;

function C({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-white/80">
      {children}
    </code>
  );
}

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-28 border-t border-white/10 pt-10 text-2xl font-semibold tracking-tight text-white"
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-sm leading-relaxed text-white/60">{children}</p>;
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4 text-sm leading-relaxed text-amber-100/85">
      {children}
    </div>
  );
}

function NavList() {
  return (
    <nav className="space-y-6">
      {NAV.map((section) => (
        <div key={section.group}>
          <p className="font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase">
            {section.group}
          </p>
          <ul className="mt-3 space-y-2 border-l border-white/10">
            {section.items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="-ml-px block border-l border-transparent pl-4 text-sm text-white/50 transition hover:border-white/40 hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function DocsPage() {
  return (
    <>
      <PageHeader current="docs" />

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-12 md:px-10 lg:grid-cols-[220px_1fr]">
        {/* Contents: a closed disclosure on small screens so the docs start
            with documentation, a persistent sidebar from lg up. */}
        <details className="group rounded-xl border border-white/10 bg-neutral-950 lg:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-white/70 transition group-open:text-white [&::-webkit-details-marker]:hidden">
            On this page
            <svg
              viewBox="0 0 20 20"
              className="float-right size-4 text-white/35 transition group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 8l5 5 5-5" />
            </svg>
          </summary>
          <div className="border-t border-white/10 px-4 py-4">
            <NavList />
          </div>
        </details>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-fit">
          <NavList />
        </aside>

        {/* Content */}
        <article className="min-w-0 max-w-3xl">
          <h1 id="welcome" className="scroll-mt-28 text-4xl font-semibold tracking-tight text-white">
            Welcome to Cloakra
          </h1>
          <P>
            Cloakra is a shielded capital-allocation desk for organizations on
            Starknet mainnet. It settles grants, bug bounties, and contributor
            payouts through the <a className="text-white/80 underline underline-offset-4 hover:text-white" href={`https://voyager.online/contract/${POOL}`} target="_blank" rel="noreferrer">STRK20 privacy pool</a>, so
            who receives and how much stays private, while the pool&apos;s public
            legs stay public and verifiable.
          </P>
          <P>
            On a transparent chain every organizational payout is also a
            disclosure. Paying a security researcher links their wallet to the
            vulnerability they reported. Splitting a grant among contributors
            publishes the salary table. Funding a round broadcasts the whole
            allocation strategy. Cloakra removes the recipient side of that
            disclosure without pretending the public side disappears.
          </P>

          <h3 className="mt-8 text-sm font-medium tracking-wide text-white/50 uppercase">
            Where everything lives
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li>Pool contract: <C>{POOL.slice(0, 18)}…</C> on Starknet mainnet</li>
            <li>Source, licence, and submission manifest: <a className="text-white/80 underline underline-offset-4 hover:text-white" href={REPO} target="_blank" rel="noreferrer">GitHub</a></li>
            <li>The app itself: <Link className="text-white/80 underline underline-offset-4 hover:text-white" href="/app">/app</Link> · receipt checker: <Link className="text-white/80 underline underline-offset-4 hover:text-white" href="/verify">/verify</Link></li>
          </ul>

          <h3 className="mt-8 text-sm font-medium tracking-wide text-white/50 uppercase">
            The stack, in one paragraph
          </h3>
          <P>
            A static Next.js frontend talking to the canonical STRK20 pool
            through <C>WalletAccountV6</C> in starknet.js. There are no Cloakra
            contracts, no backend, and no server-held keys: the pool&apos;s own
            batch call settles many transfers atomically, and every operation is
            signed by your own wallet. Cloakra never touches a viewing key -
            that is a protocol rule, not a policy choice.
          </P>

          <H id="how">How it works</H>
          <P>
            Three stages. Only the middle one is private, and the documentation
            is explicit about that throughout.
          </P>
          <ol className="mt-4 space-y-4 text-sm leading-relaxed text-white/60">
            <li>
              <strong className="text-white">1. Shield.</strong> You deposit STRK
              into the pool. This leg is public: the depositing address and the
              amount are visible onchain, forever.
            </li>
            <li>
              <strong className="text-white">2. Allocate privately.</strong>{" "}
              Splits, bounties and grants settle inside the pool as encrypted
              notes. Recipients, amounts, and the link back to your organization
              are unreadable.
            </li>
            <li>
              <strong className="text-white">3. Unshield.</strong> Recipients
              withdraw to a public address on their own schedule. That leg is
              public too. What is broken is the <em>link</em> between your
              deposit and their withdrawal.
            </li>
          </ol>

          <H id="wallet">Set up a wallet</H>
          <P>
            STRK20 operations require a privacy-enabled wallet. Today that means{" "}
            <a className="text-white/80 underline underline-offset-4 hover:text-white" href="https://www.ready.co" target="_blank" rel="noreferrer">Ready</a>.
            Cloakra detects any Starknet wallet that registers through the
            browser (Argent X, Braavos, OKX and others will appear in the
            picker), but only wallets exposing wallet-API 0.10 or later can
            perform private operations. Capability is detected with a version
            query - the app never reads your balances to feature-detect.
          </P>
          <Callout>
            <strong>Registration is not automatic.</strong> The documentation
            says wallets register on first use; in practice a dapp-initiated
            deposit is rejected with <C>NOT_REGISTERED</C> until you run
            &ldquo;Enable private tokens&rdquo; inside Ready. That one-time flow
            itself deposits 6 STRK, which the pool fee consumes entirely - so
            budget for it before your first shield.
          </Callout>

          <H id="stealthsplit">StealthSplit</H>
          <P>
            Pay a whole team from one shielded balance in a single atomic
            transaction: all transfers land or none do. Add recipients by hand
            or paste a CSV payroll - one <C>address, amount</C> per line, with
            comma, semicolon or tab separators. Every pasted row passes exactly
            the same validation as a typed one, and a malformed row is reported
            with its line number rather than silently skipped.
          </P>
          <P>
            Inside the pool no recipient can read another recipient&apos;s
            allocation. Advise recipients not to unshield their exact row amount
            immediately, though: matching withdrawals let an outside observer
            partition the split.
          </P>

          <H id="ghostbounty">GhostBounty</H>
          <P>
            A single private payout to a security researcher. The payout
            transaction names no recipient, no amount, and nothing linking them
            to your programme. The module includes an onboarding checklist for
            the researcher, because they must have a privacy-enabled wallet with
            private tokens enabled <em>before</em> a payout can reach them.
          </P>

          <H id="stealthgrant">StealthGrant</H>
          <P>
            A whole grant round disbursed in one atomic transaction. Each
            grantee sees only their own award; the recipient list and per-grant
            amounts never appear onchain. Only your total deposit into the pool
            is public.
          </P>

          <H id="treasury">Treasury</H>
          <P>
            Shield STRK into the pool and unshield back out, read your shielded
            balance (consent-gated - your wallet asks first), and review your{" "}
            <strong className="text-white">public footprint</strong>: every pool
            leg the chain can see about your account, reconstructed from the
            pool&apos;s <C>Deposit</C> and <C>Withdrawal</C> events. The
            instructive part is what is <em>absent</em> from that list - the
            private transfers and splits between the legs.
          </P>
          <Callout>
            Shielding is two wallet prompts, by design: an ERC-20 approval,
            then the private deposit. The second prompt is part of the same
            flow, not a duplicate. Freshly shielded notes also mature for about
            ten blocks before they can be spent.
          </Callout>

          <H id="model">What&apos;s private, what isn&apos;t</H>
          <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/40">
                  <th className="px-5 py-3 font-medium">Private (inside the pool)</th>
                  <th className="px-5 py-3 font-medium">Public (onchain)</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                {[
                  ["Who receives a split, bounty, or grant", "Your deposits into the pool (address + amount)"],
                  ["Per-recipient amounts", "Any withdrawal to a public wallet (address + amount)"],
                  ["The link between payer and payee", "That an address interacted with the pool, and when"],
                ].map(([a, b]) => (
                  <tr key={a} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3">{a}</td>
                    <td className="px-5 py-3 text-white/45">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <P>
            One consequence deserves emphasis: because both legs are public,
            timing and amount correlation can re-link them. Unshielding an
            amount that echoes a recent deposit, or moving funds minutes after
            shielding, undoes much of what the pool provides. Patience is part
            of the privacy.
          </P>

          <H id="warnings">Privacy warnings</H>
          <P>
            Before any private operation opens your wallet, Cloakra checks your
            own public footprint for the mechanical mistakes and warns you:
          </P>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/60">
            <li>· A deposit within roughly the last hour - the operation is cheaply timing-correlatable.</li>
            <li>· An amount that approximately matches one of your public deposits.</li>
            <li>· An amount matching a deposit minus one or more pool fees - the net-of-fee tell.</li>
            <li>· An amount matching the sum of two public deposits.</li>
          </ul>
          <P>
            Matching is deliberately <em>approximate</em>, within about one per
            cent. Real observers match approximately, so nudging an amount by
            dust does not help and the warning will not pretend otherwise -
            waiting does. Warnings never block a payment; they turn an accident
            into a choice.
          </P>
          <Callout>
            This is a bounded check over your own public legs from roughly the
            last day - not a complete privacy analysis. It cannot see the
            recipient side, longer history, or patterns across accounts.
          </Callout>

          <H id="unshield">Safe to unshield?</H>
          <P>
            The payer check above looks at your own deposits. A recipient
            unshielding a payout faces the mirror-image risk: the chain shows
            some organization&apos;s deposit going in and, later, your
            withdrawal coming out - and if the two amounts rhyme, an observer
            pairs them without needing anything private. So before an
            unshield opens the wallet, Cloakra also reads the pool&apos;s recent
            public activity by <em>every</em> account and checks:
          </P>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/60">
            <li>· Whether the amount approximately echoes another account&apos;s recent public deposit, or that deposit net of pool fees.</li>
            <li>· Whether it looks like an <strong className="text-white">equal share</strong> of such a deposit - 1/2 through 1/8, net of a few fees. Recipients of a split who each unshield their exact row re-link the run from the other end.</li>
            <li>· Whether you have unshielded about this amount before. Repeated equal withdrawals form a payroll cadence.</li>
            <li>· How busy the pool is. If few STRK withdrawals happened in the window (up to ~19 hours), yours has a thin crowd to hide in, and the check says so with the number.</li>
          </ul>
          <P>
            The Unshield panel and the dashboard both show the pool&apos;s
            current STRK crowd - withdrawals and deposits by anyone over the
            window - so the figure is visible before you type an amount, not
            only when it triggers a warning. Other tokens the pool carries are
            ignored: an ETH deposit is not a crowd for a STRK withdrawal. Recency drives severity: an echo of a
            deposit from the last hour is high; from earlier in the day,
            medium.
          </P>
          <Callout>
            This is still a bounded check. It sees roughly the last day of
            public pool activity, one account&apos;s history, and amount shapes
            an observer would try first. It cannot see longer history, patterns
            across many accounts, or what anyone does off this chain. The
            practical advice is unchanged: wait, and do not withdraw your
            exact row.
          </Callout>

          <H id="receipts">Signed payout receipts</H>
          <P>
            A shielded payout is private, which makes it awkward to prove. After
            a run settles, Cloakra can turn it into receipts with a single
            off-chain wallet signature (SNIP-12 typed data - free, no gas). The
            signature commits to the operation, the settlement transaction hash,
            the pool, the recipient count, and a salted Merkle root over every{" "}
            <C>(recipient, amount)</C> pair.
          </P>
          <P>
            Each recipient receives a file carrying only <em>their</em> leaf and
            proof, so a receipt discloses nothing about anyone else in the run.
            The salts stop anyone brute-forcing the root against guessed
            address and amount pairs.
          </P>
          <Callout>
            <strong>A receipt is an attestation, not proof of transfer.</strong>{" "}
            The pool keeps transaction contents private by design, so no scheme
            can verify the shielded movement itself. What verification proves is
            that the paying organization signed this statement, and that the
            transaction it references really settled and touched the pool. A
            receipt is exactly as trustworthy as its signer.
          </Callout>

          <H id="verifying">Verifying a receipt</H>
          <P>
            Anyone can check a receipt at <Link className="text-white/80 underline underline-offset-4 hover:text-white" href="/verify">/verify</Link> -
            no wallet, no account, no trust in Cloakra. Four checks run:
          </P>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/60">
            <li>· The file is well-formed, and its chain and pool match the ones verification uses.</li>
            <li>· The recipient and amount really sit inside the signed commitment (Merkle proof).</li>
            <li>· The organization&apos;s account signed the run - checked onchain via SNIP-6 <C>is_valid_signature</C>.</li>
            <li>· The referenced transaction settled <em>and</em> emitted STRK20 pool events.</li>
          </ul>
          <P>
            The displayed amount is derived from the signed value rather than
            the file&apos;s human-readable field, so a receipt cannot be edited
            to show a different number under a passing check.
          </P>

          <H id="auditing">Auditing a run</H>
          <P>
            A recipient holds one receipt. An auditor holds a folder of them
            and one question: did this organization pay what it claims? Drop
            every receipt from a run onto <Link className="text-white/80 underline underline-offset-4 hover:text-white" href="/verify">/verify</Link> -
            files, a JSON list, or one receipt per line - and the page becomes
            the auditor&apos;s desk:
          </P>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/60">
            <li>· Every receipt is verified with the same four checks, and grouped by the run its signed fields describe.</li>
            <li>· The org&apos;s signature and the settlement are checked <em>once</em> per run, however many receipts share them.</li>
            <li>· Each run reports <strong className="text-white">coverage</strong> - receipts present against the recipient count the org signed - and the <strong className="text-white">verified total</strong>, summed only over rows that pass.</li>
            <li>· Anomalies an honest run cannot produce are called out: two receipts naming one recipient, more recipients than the signed count, two attestations for the same settlement transaction.</li>
            <li>· The result downloads as a CSV, one line per receipt, with exact amounts.</li>
          </ul>
          <P>
            Verdicts are deliberately narrow. <em>Verified</em> means every
            supplied receipt passes and the run is fully covered. <em>Partial
            coverage</em> means every supplied receipt passes but some are
            missing - the total covers only those present, and a missing
            receipt is a gap in the audit, not evidence of anything.{" "}
            <em>Inconclusive</em> means the chain could not be reached for a
            check; nothing is presumed. <em>Does not verify</em> means at least
            one row failed a check the receipt scheme can actually make.
          </P>
          <Callout>
            An audit inherits the receipt scheme&apos;s limit: it establishes
            what the org <em>attested</em>, and that the attested settlement
            really happened in the pool. The shielded transfers inside that
            settlement stay private by design. An auditor who needs more than
            the org&apos;s signed word needs a viewing key, which no dapp -
            Cloakra included - is allowed to hold.
          </Callout>

          <H id="fees">Fees &amp; registration</H>
          <P>
            The pool charges a flat fee per private operation. Cloakra reads it
            live from the contract with <C>get_fee_amount</C> and never
            hardcodes it - the fee moved from 4 to 6 STRK during the sprint,
            which is precisely why. On a shield the fee is deducted{" "}
            <em>from</em> the deposit: shielding 26 STRK leaves a 20 STRK
            shielded balance.
          </P>
          <P>
            The fee is re-read at signing time, and a submit is aborted if it
            changed between quote and signature rather than letting the
            transaction revert after you have already approved it.
          </P>

          <H id="mainnet">Mainnet transactions</H>
          <P>
            Cloakra&apos;s submission records three mainnet transactions, all
            accepted on L1 with successful execution and confirmed to have
            emitted STRK20 pool events. The landing page re-verifies them
            against Starknet in your own browser on every visit - a fabricated
            hash renders a red <C>NOT FOUND</C>, so the claim is falsifiable
            through the interface itself.
          </P>
          <P>
            The repository ships <C>scripts/verify-tx.mjs</C> and{" "}
            <C>scripts/preflight.mjs</C> if you would rather check them from a
            terminal than trust a web page.
          </P>

          <H id="architecture">Architecture</H>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-white/60">
            <li>
              <strong className="text-white">No custom contracts.</strong>{" "}
              <C>strk20InvokeTransaction</C> accepts an array of actions settled
              atomically, so a multi-recipient split needs no bespoke Cairo.
              There is nothing of ours to audit beyond the canonical pool.
            </li>
            <li>
              <strong className="text-white">No backend, no server keys.</strong>{" "}
              A static frontend plus your wallet is the entire attack surface.
            </li>
            <li>
              <strong className="text-white">Events, never senders.</strong>{" "}
              Private transactions are relayed, so the transaction sender is the
              relayer for everyone. Any per-account view reads pool events
              instead - attributing by sender would credit every deposit to one
              address.
            </li>
            <li>
              <strong className="text-white">Receipts are inspected.</strong>{" "}
              starknet.js resolves <C>waitForTransaction</C> for reverted
              transactions, so success is confirmed from the receipt&apos;s
              execution status. A reverted payout is never shown as confirmed.
            </li>
          </ul>

          <H id="limits">Known limits</H>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-white/60">
            <li>· Wallet support is narrow: Ready today, Xverse in progress. Other wallets connect but stay read-only.</li>
            <li>· Recipients must register in the pool themselves, and that registration costs them 6 STRK.</li>
            <li>· Receipts prove attestation, not transfer - see above.</li>
            <li>· The privacy checks are bounded to roughly a day of public pool activity and amount shapes an observer would try first; they cannot see longer history or off-chain context.</li>
            <li>· Shielded balances below the pool fee are effectively stranded until the balance is topped up.</li>
            <li>· The treasury legs are hash-proven on mainnet; the private transfer and split flows ride the same wallet API against the same pool but are not yet exercised by a recorded hash.</li>
          </ul>
          <Callout>
            Cloakra is unaudited hackathon software built for the STRK20 Private
            Sprint. It holds no keys and cannot move your funds, but it has not
            been through a security review. Use amounts you can afford to
            experiment with.
          </Callout>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
