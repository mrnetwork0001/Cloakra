"use client";

import { useEffect, useState } from "react";
import { getPoolFeeCached } from "./pool";

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
