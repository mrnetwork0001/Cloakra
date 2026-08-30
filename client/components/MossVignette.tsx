/**
 * Organic dark vignette anchoring the top and bottom of the page, echoing
 * the reference's mossy landscape corners. Pure CSS gradients - no images.
 */
export default function MossVignette({ position }: { position: "top" | "bottom" }) {
  const isTop = position === "top";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 ${isTop ? "top-0" : "bottom-0"} h-[340px] overflow-hidden`}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(60% 130% at 8% " + (isTop ? "0%" : "100%") + ", rgba(34,60,42,0.85), transparent 70%)",
            "radial-gradient(55% 120% at 92% " + (isTop ? "0%" : "100%") + ", rgba(28,52,38,0.8), transparent 70%)",
            "radial-gradient(80% 90% at 50% " + (isTop ? "-10%" : "110%") + ", rgba(12,20,15,0.9), transparent 75%)",
          ].join(","),
        }}
      />
      {/* speckle texture */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "13px 13px, 21px 21px",
          backgroundPosition: "0 0, 7px 9px",
        }}
      />
      <div
        className={`absolute inset-x-0 ${isTop ? "bottom-0" : "top-0"} h-40`}
        style={{
          backgroundImage: `linear-gradient(${isTop ? "to bottom" : "to top"}, transparent, #000)`,
        }}
      />
    </div>
  );
}
