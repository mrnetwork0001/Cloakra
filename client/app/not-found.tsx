import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <p className="text-sm font-medium tracking-[0.2em] text-white/40 uppercase">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
        Nothing shielded here — the page just doesn&apos;t exist.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-white/50">
        The pool hides balances, not routes. Try the landing page or the app.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-lg border border-white/20 bg-white/[0.05] px-4 py-2.5 font-medium text-white transition hover:border-white/40"
        >
          Landing
        </Link>
        <Link
          href="/app"
          className="rounded-lg border border-white/15 px-4 py-2.5 text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Open the app
        </Link>
      </div>
    </main>
  );
}
