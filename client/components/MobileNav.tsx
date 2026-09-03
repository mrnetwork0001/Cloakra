"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Modules", href: "#modules" },
  { label: "Proof", href: "#proof" },
] as const;

/**
 * Hamburger for the landing header below the md breakpoint, where the inline
 * nav links are hidden. Anchor links close the panel on tap so the page can
 * actually scroll to the target.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Escape, and any pointer landing outside the menu, close it. A fixed
  // overlay cannot be used here: the header sets backdrop-filter, which makes
  // it the containing block for fixed descendants, so the layer would never
  // cover the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="md:hidden">
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
            </nav>
        </div>
      ) : null}
    </div>
  );
}
