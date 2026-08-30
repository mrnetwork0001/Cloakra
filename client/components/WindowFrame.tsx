/**
 * Decorative app-window chrome. Deliberately NOT a screenshot: it frames
 * abstract artwork, so it can never be mistaken for a claim about what the
 * product displays.
 */
export default function WindowFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/60 ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 h-4 flex-1 rounded bg-white/[0.04]" />
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
