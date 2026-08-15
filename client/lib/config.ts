/**
 * Runtime configuration for the Cloakra dapp.
 *
 * The RPC URL is a NEXT_PUBLIC_ var because the browser makes the calls
 * directly. That means the Alchemy key ships to the client — that is normal for
 * a dapp, but restrict the key by domain in the Alchemy dashboard rather than
 * treating it as a secret.
 */

/** Starknet mainnet chain id, as returned by `getChainId()` (short string felt). */
export const SN_MAIN = "0x534e5f4d41494e";

/** Canonical STRK20 privacy pool on Starknet mainnet. */
export const STRK20_POOL_ADDRESS =
  "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";

/** STRK on Starknet mainnet — the token Cloakra shields. */
export const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL ?? "";

export function voyagerTx(hash: string): string {
  return `https://voyager.online/tx/${hash}`;
}

export function voyagerContract(address: string): string {
  return `https://voyager.online/contract/${address}`;
}

/** Shorten an address or hash for display: 0x1234…cdef */
export function shorten(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
