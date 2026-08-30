import Link from "next/link";

const POOL =
  "https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";
const REPO = "https://github.com/mrnetwork0001/Cloakra";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "StealthSplit", href: "/app" },
      { label: "GhostBounty", href: "/app" },
      { label: "StealthGrant", href: "/app" },
      { label: "Treasury", href: "/app" },
      { label: "Verify a receipt", href: "/verify" },
    ],
  },
  {
    heading: "Ecosystem",
    links: [
      { label: "STRK20 pool", href: POOL, external: true },
      { label: "Ready wallet", href: "https://www.ready.co", external: true },
      { label: "STRK20 by example", href: "https://strk20-by-example.org", external: true },
      { label: "Starknet", href: "https://www.starknet.io", external: true },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "GitHub", href: REPO, external: true },
      { label: "Evaluate in 5 min", href: `${REPO}/blob/main/EVALUATE.md`, external: true },
      { label: "Architecture", href: `${REPO}/blob/main/ARCHITECTURE.md`, external: true },
      { label: "strk20.json", href: `${REPO}/blob/main/strk20.json`, external: true },
    ],
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

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10">
      {/* faint grid, as on the reference */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "104px 104px",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:px-10">
        <div>
          <div className="flex items-center gap-3">
            <ShieldMark className="size-8 text-white" />
            <span className="text-lg font-semibold tracking-tight text-white">Cloakra</span>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/45">
            Shielded capital allocation on Starknet. Grants, bug bounties, and
            contributor payouts settle through the STRK20 privacy pool - who
            receives and how much stays private, while the public legs stay
            honestly, verifiably public.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              aria-label="Cloakra on GitHub"
              className="rounded-full border border-white/10 p-2 text-white/50 transition hover:border-white/30 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
              </svg>
            </a>
            <a
              href={POOL}
              target="_blank"
              rel="noreferrer"
              aria-label="STRK20 pool contract on Voyager"
              className="rounded-full border border-white/10 p-2 text-white/50 transition hover:border-white/30 hover:text-white"
            >
              <ShieldMark className="size-4" />
            </a>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="font-mono text-[11px] tracking-[0.25em] text-white/35 uppercase">
              {col.heading}
            </p>
            <ul className="mt-5 space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  {"external" in l && l.external ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm text-white/55 transition hover:text-white"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="font-mono text-sm text-white/55 transition hover:text-white"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-6 text-xs text-white/30 md:px-10">
        <span>Cloakra · Apache 2.0 · Built for the STRK20 Private Sprint</span>
        <span>Live on Starknet mainnet</span>
      </div>
    </footer>
  );
}
