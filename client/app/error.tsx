"use client";

/**
 * App-level error boundary. A component crash must never white-screen the
 * app — especially not with a wallet connected and funds in the pool. No
 * on-chain state can be harmed by a UI crash; say so, plainly.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-2xl font-semibold text-white">Something broke in the UI</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/60">
        This was a display error — nothing on-chain was affected by it. Your
        shielded balance and any submitted transactions are untouched; anything
        in flight can be checked on Voyager via its transaction hash.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/40">
        {error.message}
      </pre>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg border border-white/20 bg-white/[0.05] px-4 py-2.5 font-medium text-white transition hover:border-white/40"
      >
        Reload the app
      </button>
    </main>
  );
}
