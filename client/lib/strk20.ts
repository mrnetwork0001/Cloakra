/**
 * STRK20 capability detection and wallet-mediated reads.
 *
 * Least-privilege rule (STRK20_INTEGRATION_PLAN.md §5): capability detection is
 * a version query only. `strk20Balances` is a consent-gated balance read — the
 * wallet prompts the user — so it is never used to feature-detect and is only
 * called on an explicit user action.
 */

import { walletV6, type WalletAccountV6 } from "starknet";
import type { DiscoveredWallet } from "./wallet";
import { STRK_TOKEN_ADDRESS } from "./config";

/** Wallet-API version at which STRK20 actions exist (spec v0.10.x). */
const STRK20_MIN_WALLET_API: readonly [number, number] = [0, 10];

function versionAtLeast(version: string, [major, minor]: readonly [number, number]): boolean {
  const parts = version.split(".").map((p) => Number.parseInt(p, 10));
  if (Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return false;
  return parts[0] > major || (parts[0] === major && parts[1] >= minor);
}

/**
 * True when the wallet's dapp-facing API is STRK20-capable (wallet-API ≥ 0.10).
 * A wallet that predates the method, rejects the request, or reports only
 * older versions is simply not capable — never an error surfaced to the user.
 */
export async function detectStrk20Support(
  wallet: DiscoveredWallet,
): Promise<boolean> {
  try {
    const versions = await walletV6.supportedWalletApi(
      // Same nominal-duplication cast as connectWallet — see lib/wallet.ts.
      wallet as Parameters<typeof walletV6.supportedWalletApi>[0],
    );
    return versions.some((v) => versionAtLeast(v, STRK20_MIN_WALLET_API));
  } catch {
    return false;
  }
}

/**
 * The chain the WALLET is on — the one its transactions go to. Not the same
 * thing as `account.provider.getChainId()`, which reports our own RPC's chain
 * and is therefore always mainnet here regardless of the wallet's network.
 */
export async function getWalletChainId(
  wallet: DiscoveredWallet,
): Promise<string> {
  return walletV6.requestChainId(
    wallet as Parameters<typeof walletV6.requestChainId>[0],
  );
}

export interface ShieldedBalance {
  token: string;
  /** Raw balance in the token's smallest unit. */
  raw: bigint;
}

/**
 * Read the user's shielded balances through their wallet. Consent-gated: the
 * wallet prompts before sharing. Call only from a direct user action.
 */
export async function readShieldedBalances(
  account: WalletAccountV6,
  tokens: string[] = [STRK_TOKEN_ADDRESS],
): Promise<ShieldedBalance[]> {
  const entries = await account.strk20Balances(tokens);
  return entries.map((entry) => ({
    token: entry.token,
    raw: BigInt(entry.balance),
  }));
}

/** Format a raw 18-decimal amount for display, e.g. 12.3456 STRK. */
export function formatTokenAmount(raw: bigint, decimals = 18, places = 4): string {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const frac = raw % base;
  if (places === 0 || frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, places);
  const out = `${whole}.${fracStr}`.replace(/\.?0+$/, "") || "0";
  // A nonzero balance below the display precision must not render as "0" —
  // that is indistinguishable from an empty balance.
  if (out === "0" && raw > 0n) return `< 0.${"0".repeat(places - 1)}1`;
  return out;
}

/** True when an unknown error represents the user declining in the wallet. */
export function isUserRefusal(err: unknown): boolean {
  // The wallet-api typed rejection is USER_REFUSED_OP, and it may arrive as a
  // plain {code, message} object rather than an Error instance.
  const message =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  return /refus|reject|denied|abort/i.test(message);
}

/**
 * Felts have many spellings (0x4718… vs 0x04718…, case-insensitive hex) —
 * compare numerically. Applies to addresses AND chain ids alike.
 */
export function sameFelt(a: string, b: string): boolean {
  try {
    return BigInt(a) === BigInt(b);
  } catch {
    return false;
  }
}

export const sameAddress = sameFelt;
