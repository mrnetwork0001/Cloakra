/**
 * Read-only pool + token queries over our own RPC. Public data only — these
 * never touch the wallet and need no consent.
 */

import { RpcProvider } from "starknet";
import { RPC_URL, STRK20_POOL_ADDRESS, STRK_TOKEN_ADDRESS } from "./config";

let provider: RpcProvider | undefined;

export function getProvider(): RpcProvider {
  if (!provider) provider = new RpcProvider({ nodeUrl: RPC_URL });
  return provider;
}

let feeCache: { value: bigint; at: number } | null = null;

/**
 * Flat pool fee per private operation, read live (`get_fee_amount`, u128).
 * Never hardcode it — it was 4 STRK in July docs and 6 STRK by mid-August.
 * Every successful read refreshes the shared cache used by getPoolFeeCached.
 */
export async function getPoolFee(): Promise<bigint> {
  const res = await getProvider().callContract({
    contractAddress: STRK20_POOL_ADDRESS,
    entrypoint: "get_fee_amount",
    calldata: [],
  });
  const value = BigInt(res[0]);
  feeCache = { value, at: Date.now() };
  return value;
}

/**
 * Cached fee for display: three panels mount at once and would otherwise fire
 * three identical RPC calls. Signing-time re-checks use getPoolFee() directly.
 */
export async function getPoolFeeCached(maxAgeMs = 30_000): Promise<bigint> {
  if (feeCache && Date.now() - feeCache.at < maxAgeMs) return feeCache.value;
  return getPoolFee();
}

/** Public (unshielded) STRK balance of an address — the ERC-20 leg. */
export async function getPublicStrkBalance(address: string): Promise<bigint> {
  const res = await getProvider().callContract({
    contractAddress: STRK_TOKEN_ADDRESS,
    entrypoint: "balance_of",
    calldata: [address],
  });
  // u256 comes back as [low, high]
  return BigInt(res[0]) + (BigInt(res[1] ?? 0) << 128n);
}
