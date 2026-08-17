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

/**
 * Flat pool fee per private operation, read live (`get_fee_amount`, u128).
 * Never hardcode it — it was 4 STRK in July docs and 6 STRK by mid-August.
 */
export async function getPoolFee(): Promise<bigint> {
  const res = await getProvider().callContract({
    contractAddress: STRK20_POOL_ADDRESS,
    entrypoint: "get_fee_amount",
    calldata: [],
  });
  return BigInt(res[0]);
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
