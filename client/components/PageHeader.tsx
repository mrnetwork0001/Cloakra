import Image from "next/image";
import Link from "next/link";

const REPO = "https://github.com/mrnetwork0001/Cloakra";

const LINKS = [
  { key: "app", label: "App", href: "/app" },
  { key: "docs", label: "Docs", href: "/docs" },
  { key: "verify", label: "Verify", href: "/verify" },
] as const;

/** The secondary pages' header: logo home, and the other surfaces. */
export default function PageHeader({
  current,
}: {
  current?: (typeof LINKS)[number]["key"];
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2 md:px-10">
        <Link href="/" className="flex items-center" aria-label="Cloakra home">
          <Image
            src="/cloakra-header.png"
            alt="Cloakra"
            width={1923}
            height={818}
            priority
            className="h-11 w-auto sm:h-16"
          />
        </Link>
        <div className="flex items-center gap-5 font-mono text-xs tracking-[0.15em] text-white/45 uppercase sm:gap-6">
          {LINKS.filter((l) => l.key !== current).map((l) => (
            <Link key={l.key} className="transition hover:text-white" href={l.href}>
              {l.label}
            </Link>
          ))}
          <a className="transition hover:text-white" href={REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}
