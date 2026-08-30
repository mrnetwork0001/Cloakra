"use client";

import { useEffect, useState } from "react";
import { getPoolFeeCached } from "@/lib/pool";
import { formatTokenAmount } from "@/lib/strk20";

/**
 * The flat pool fee, read from the pool contract in the viewer's browser.
 * Not decoration: the fee changed mid-sprint (4 → 6 STRK), which is exactly
 * why nothing in Cloakra hardcodes it - and why this line proves the page is
 * talking to mainnet rather than reciting copy.
 */
export default function LiveFee() {
  const [fee, setFee] = useState<bigint | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stale = false;
    getPoolFeeCached()
      .then((value) => {
        if (!stale) setFee(value);
      })
      .catch(() => {
        if (!stale) setFailed(true);
      });
    return () => {
      stale = true;
    };
  }, []);

  return (
    <p className="mt-3 text-sm leading-relaxed text-white/55">
      Flat pool fee per private operation right now:{" "}
      <span className="text-white/85">
        {fee !== null ? `${formatTokenAmount(fee)} STRK` : failed ? "unreadable (RPC)" : "…"}
      </span>{" "}
      - read live from the pool contract in your browser, never hardcoded.
    </p>
  );
}
