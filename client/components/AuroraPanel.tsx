/**
 * The design system's visual signature: an iridescent aurora panel, pure CSS
 * (layered radial/conic gradients under blur) — no images, no requests.
 */
export default function AuroraPanel({
  variant = 0,
  className = "",
}: {
  variant?: 0 | 1 | 2;
  className?: string;
}) {
  const layers = [
    // emerald → teal → violet
    "radial-gradient(120% 90% at 20% 10%, rgba(52,211,153,0.55), transparent 55%), radial-gradient(90% 80% at 80% 30%, rgba(45,212,191,0.4), transparent 60%), radial-gradient(110% 90% at 60% 90%, rgba(139,92,246,0.35), transparent 60%)",
    // violet → emerald sweep
    "radial-gradient(100% 90% at 80% 15%, rgba(139,92,246,0.45), transparent 55%), radial-gradient(120% 80% at 15% 60%, rgba(52,211,153,0.45), transparent 60%), radial-gradient(80% 90% at 60% 100%, rgba(56,189,248,0.3), transparent 60%)",
    // teal core
    "radial-gradient(120% 100% at 50% 0%, rgba(45,212,191,0.5), transparent 60%), radial-gradient(100% 90% at 10% 90%, rgba(52,211,153,0.35), transparent 55%), radial-gradient(90% 90% at 90% 80%, rgba(139,92,246,0.3), transparent 55%)",
  ] as const;

  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 ${className}`}
    >
      <div
        className="absolute inset-[-30%] blur-2xl saturate-150"
        style={{ backgroundImage: layers[variant] }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
    </div>
  );
}
