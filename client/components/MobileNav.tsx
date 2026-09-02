"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Modules", href: "#modules" },
  { label: "Proof", href: "#proof" },
  { label: "FAQ", href: "#faq" },
] as const;

/**
 * Hamburger for the landing header below the md breakpoint, where the inline
 * nav links are hidden. Anchor links close the panel on tap so the page can
 * actually scroll to the target.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex size-10 items-center justify-center rounded-lg border border-white/15 text-white/70 transition hover:border-white/30 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      {open ? (
        <>
          {/* tap-away layer, below the panel but above the page */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 top-[var(--header-h,72px)] bottom-0 z-30 cursor-default bg-black/60"
          />
          <div className="absolute inset-x-0 top-full z-40 border-b border-white/10 bg-black/95 backdrop-blur">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/docs"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                Docs
              </Link>
              <Link
                href="/app"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-white px-5 py-3 text-center text-base font-medium text-black transition hover:bg-white/90"
              >
                Open the app
              </Link>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
