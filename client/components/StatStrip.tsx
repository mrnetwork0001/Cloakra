"use client";

import { useEffect, useState } from "react";
import { getPoolFeeCached, getPublicStrkBalance } from "@/lib/pool";
import { formatTokenAmount } from "@/lib/strk20";
import { shorten } from "@/lib/config";

/**
 * Dashboard metrics. Every figure here is PUBLIC data read over our own RPC -
 * no wallet involvement and no consent prompt. The shielded balance is
 * deliberately absent: it is consent-gated and lives in its own tile.
 */
export default function StatStrip({
  address,
  wrongChain,
}: {
  address: string;
  wrongChain: boolean;
}) {
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);

  useEffect(() => {
    let stale = false;
    getPublicStrkBalance(address)
      .then((b) => !stale && setPublicBalance(b))
      .catch(() => {});
    getPoolFeeCached()
      .then((f) => !stale && setFee(f))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [address]);

  const tiles = [
    {
      label: "Public balance",
      value: publicBalance !== null ? `${formatTokenAmount(publicBalance)} STRK` : "…",
      note: "unshielded, visible onchain",
    },
    {
      label: "Pool fee",
      value: fee !== null ? `${formatTokenAmount(fee)} STRK` : "…",
      note: "per private operation, read live",
    },
    {
      label: "Account",
      value: shorten(address, 6, 4),
      note: "signing wallet",
      mono: true,
    },
    {
      label: "Network",
      value: wrongChain ? "Wrong network" : "Starknet mainnet",
      note: wrongChain ? "switch to mainnet" : "SN_MAIN",
      warn: wrongChain,
    },
  ];

  return (
    <dl className="grid gap-px overflow-hidden rounded-xl border border-white/10 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="bg-neutral-950 px-4 py-4">
          <dt className="text-[11px] tracking-[0.15em] text-white/35 uppercase">
            {t.label}
          </dt>
          <dd
            className={`mt-1.5 text-lg ${t.warn ? "text-amber-300" : "text-white"} ${
              t.mono ? "font-mono text-base" : ""
            }`}
          >
            {t.value}
          </dd>
          <dd className="mt-0.5 text-xs text-white/30">{t.note}</dd>
        </div>
      ))}
    </dl>
  );
}
