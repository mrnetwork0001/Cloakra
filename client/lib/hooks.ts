"use client";

import { useEffect, useState } from "react";
import { getPoolFeeCached } from "./pool";
import { fetchPoolCrowd, type PoolCrowd } from "./privacy";

/**
 * Live pool fee for display. Fetches when `active` (the panel is showing its
 * form); the shared cache in pool.ts dedupes concurrent panels. A transient
 * RPC failure keeps the last good value rather than blanking the fee.
 */
export function usePoolFee(active: boolean): bigint | null {
  const [fee, setFee] = useState<bigint | null>(null);
  useEffect(() => {
    if (!active) return;
    let stale = false;
    getPoolFeeCached()
      .then((value) => {
        if (!stale) setFee(value);
      })
      .catch(() => {
        /* keep last good value */
      });
    return () => {
      stale = true;
    };
  }, [active]);
  return fee;
}

export type PoolCrowdState = PoolCrowd | "unavailable" | null;

/**
 * The pool's recent STRK crowd for display - withdrawals and deposits by
 * anyone over the last ~19 hours. Public data over our own RPC; shares the
 * scan the unshield privacy check runs, via the cache in events.ts. A failed
 * scan reports "unavailable" unless an earlier good value exists, so the
 * panel shows a dash instead of an ellipsis that never resolves.
 */
export function usePoolCrowd(active: boolean): PoolCrowdState {
  const [crowd, setCrowd] = useState<PoolCrowdState>(null);
  useEffect(() => {
    if (!active) return;
    let stale = false;
    fetchPoolCrowd()
      .then((value) => {
        if (!stale) setCrowd(value);
      })
      .catch(() => {
        if (!stale) setCrowd((prev) => (prev && prev !== "unavailable" ? prev : "unavailable"));
      });
    return () => {
      stale = true;
    };
  }, [active]);
  return crowd;
}
