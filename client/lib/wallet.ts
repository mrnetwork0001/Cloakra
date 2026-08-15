/**
 * Wallet connection over get-starknet v6 + starknet.js WalletAccountV6.
 *
 * WalletAccountV6 is the piece that matters for Cloakra: it exposes the STRK20
 * privacy actions (`strk20Balances`, `strk20PrepareInvoke`,
 * `strk20InvokeTransaction`) directly, so shield / private transfer / unshield
 * go through the user's wallet rather than any server-held key.
 */

import { createStore, type Store } from "@starknet-io/get-starknet-discovery";
import { WalletAccountV6 } from "starknet";
import { RPC_URL } from "./config";

/**
 * Derived from the store rather than imported from
 * `@starknet-io/get-starknet-wallet-standard`, deliberately — see the note on
 * the cast in `connectWallet`.
 */
export type DiscoveredWallet = ReturnType<Store["getWallets"]>[number];

let store: Store | undefined;

/** Lazily create the discovery store — browser only. */
export function getStore(): Store {
  if (!store) store = createStore();
  return store;
}

export function listWallets(): DiscoveredWallet[] {
  return getStore().getWallets();
}

/** Subscribe to wallets appearing/disappearing (extensions load asynchronously). */
export function subscribeWallets(
  listener: (wallets: readonly DiscoveredWallet[]) => void,
): () => void {
  return getStore().subscribe(listener);
}

export async function connectWallet(
  wallet: DiscoveredWallet,
): Promise<WalletAccountV6> {
  if (!RPC_URL) {
    throw new Error(
      "NEXT_PUBLIC_STARKNET_RPC_URL is not set. Copy client/.env.local.example to client/.env.local and add your Alchemy key.",
    );
  }

  return WalletAccountV6.connect(
    { nodeUrl: RPC_URL },
    // starknet.js depends on wallet-standard 6.0.2 under the alias
    // `get-starknet-wallet-standard-v6`, while get-starknet-discovery resolves
    // 6.0.3 under the plain name. Two copies of the same package means TS sees
    // two distinct nominal types for one runtime object, so the structural
    // check fails on identical shapes. Revisit when starknet.js bumps its pin.
    wallet as Parameters<typeof WalletAccountV6.connect>[1],
  );
}
