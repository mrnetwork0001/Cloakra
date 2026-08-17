"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { constants, type WalletAccountV6 } from "starknet";
import {
  connectWallet,
  listWallets,
  subscribeWallets,
  type DiscoveredWallet,
} from "@/lib/wallet";
import {
  detectStrk20Support,
  getWalletChainId,
  isUserRefusal,
  sameFelt,
} from "@/lib/strk20";
import { shorten, voyagerContract, STRK20_POOL_ADDRESS } from "@/lib/config";
import ShieldedBalance from "./ShieldedBalance";

const SN_MAIN = constants.StarknetChainId.SN_MAIN;

type Status =
  | { kind: "idle" }
  | { kind: "connecting" }
  | {
      kind: "connected";
      account: WalletAccountV6;
      wallet: DiscoveredWallet;
      /** Live address — updated by the wallet's change events. */
      address: string;
      /** The WALLET's chain (walletV6.requestChainId) — where its txs go. */
      chainId: string;
      /** Wallet-API ≥ 0.10 — detected via version query, never a data probe. */
      strk20: boolean;
    }
  | { kind: "error"; message: string };

/** What the rest of the app needs to act on behalf of the user. */
export interface WalletSession {
  account: WalletAccountV6;
  address: string;
  strk20: boolean;
  wrongChain: boolean;
}

export default function WalletPanel({
  onSession,
}: {
  onSession?: (session: WalletSession | null) => void;
}) {
  const [wallets, setWallets] = useState<readonly DiscoveredWallet[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  // Latest-wins token: bumping it makes any in-flight connect attempt stale,
  // so a hung wallet popup can be cancelled and can't overwrite a later state.
  const attemptRef = useRef(0);
  // Same idea for async chain-id reads: out-of-order resolutions must not
  // clobber a newer value (connect / onChange / switch all read it).
  const chainSeqRef = useRef(0);
  const unsubChangeRef = useRef<(() => void) | null>(null);

  // Extensions inject asynchronously, so seed once then follow the store.
  useEffect(() => {
    setWallets(listWallets());
    return subscribeWallets(setWallets);
  }, []);

  // Drop the wallet-event subscription with the component.
  useEffect(
    () => () => {
      unsubChangeRef.current?.();
    },
    [],
  );

  // Report the session upward whenever it materially changes.
  useEffect(() => {
    if (!onSession) return;
    onSession(
      status.kind === "connected"
        ? {
            account: status.account,
            address: status.address,
            strk20: status.strk20,
            wrongChain: !sameFelt(status.chainId, SN_MAIN),
          }
        : null,
    );
  }, [status, onSession]);

  const onConnect = useCallback(async (wallet: DiscoveredWallet) => {
    const attempt = ++attemptRef.current;
    unsubChangeRef.current?.();
    unsubChangeRef.current = null;
    setSwitchError(null);
    setStatus({ kind: "connecting" });
    try {
      // Capability first: a plain version query, no user data involved.
      const strk20 = await detectStrk20Support(wallet);
      const account = await connectWallet(wallet);
      // Guard on the WALLET's chain, not account.provider.getChainId() —
      // the provider reports our own RPC, which is always mainnet here.
      const seq = ++chainSeqRef.current;
      const chainId = await getWalletChainId(wallet);
      if (attemptRef.current !== attempt) return; // cancelled or superseded
      if (chainSeqRef.current !== seq) return; // a newer chain read exists
      setStatus({
        kind: "connected",
        account,
        wallet,
        address: account.address,
        chainId,
        strk20,
      });
      // Follow in-wallet account/network switches: re-read the authoritative
      // values on every change event. starknet.js keeps account.address
      // current; the chain comes from the wallet-api query.
      unsubChangeRef.current = account.onChange(() => {
        void (async () => {
          const seq = ++chainSeqRef.current;
          const nextChainId = await getWalletChainId(wallet).catch(() => null);
          if (chainSeqRef.current !== seq) return; // a newer read superseded us
          setStatus((prev) =>
            prev.kind === "connected"
              ? {
                  ...prev,
                  address: prev.account.address,
                  chainId: nextChainId ?? prev.chainId,
                }
              : prev,
          );
        })();
      });
    } catch (err) {
      if (attemptRef.current !== attempt) return;
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const onCancelConnect = useCallback(() => {
    attemptRef.current++;
    setStatus({ kind: "idle" });
  }, []);

  const onDisconnect = useCallback(() => {
    attemptRef.current++;
    unsubChangeRef.current?.();
    unsubChangeRef.current = null;
    setSwitchError(null);
    setStatus({ kind: "idle" });
  }, []);

  const onSwitchChain = useCallback(async () => {
    if (status.kind !== "connected") return;
    setSwitching(true);
    setSwitchError(null);
    try {
      const ok = await status.account.switchStarknetChain(SN_MAIN);
      const seq = ++chainSeqRef.current;
      const chainId = await getWalletChainId(status.wallet);
      if (chainSeqRef.current === seq) {
        setStatus((prev) =>
          prev.kind === "connected" ? { ...prev, chainId } : prev,
        );
      }
      if (!ok && !sameFelt(chainId, SN_MAIN)) {
        setSwitchError("The wallet declined the network switch.");
      }
    } catch (err) {
      // Declining a switch is routine — never tear the session down over it.
      setSwitchError(
        isUserRefusal(err)
          ? "Network switch declined in the wallet."
          : "Could not switch network — try it from inside the wallet.",
      );
    } finally {
      setSwitching(false);
    }
  }, [status]);

  if (status.kind === "connected") {
    const wrongChain = !sameFelt(status.chainId, SN_MAIN);

    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
            Wallet
          </h2>
          <button
            type="button"
            onClick={onDisconnect}
            className="text-xs text-white/40 underline-offset-4 transition hover:text-white/70 hover:underline"
          >
            Disconnect
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`size-2 shrink-0 rounded-full ${wrongChain ? "bg-amber-400" : "bg-emerald-400"}`}
            />
            <code className="text-lg text-white">
              {shorten(status.address, 10, 6)}
            </code>
          </div>

          {wrongChain ? (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-3 text-sm text-amber-200">
              <p>
                Cloakra settles on Starknet mainnet. The wallet reports{" "}
                <code>{status.chainId}</code>.
              </p>
              <button
                type="button"
                onClick={onSwitchChain}
                disabled={switching}
                className="mt-2 rounded-md border border-amber-400/40 px-3 py-1.5 font-medium transition hover:bg-amber-400/15 disabled:opacity-50"
              >
                {switching ? "Switching…" : "Switch to mainnet"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-white/50">
              Starknet mainnet · shielding through the{" "}
              <a
                className="text-white/80 underline underline-offset-4 hover:text-white"
                href={voyagerContract(STRK20_POOL_ADDRESS)}
                target="_blank"
                rel="noreferrer"
              >
                STRK20 pool
              </a>
            </p>
          )}

          {switchError ? (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
              {switchError}
            </p>
          ) : null}

          {!wrongChain &&
            (status.strk20 ? (
              // Keyed by the LIVE address (kept current via onChange), so an
              // in-wallet account switch resets the revealed balance.
              <ShieldedBalance key={status.address} account={status.account} />
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/60">
                <p>
                  This wallet can&apos;t do private transfers — STRK20 needs a
                  privacy-enabled wallet. Install{" "}
                  <a
                    className="text-white/90 underline underline-offset-4 hover:text-white"
                    href="https://www.ready.co"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ready
                  </a>{" "}
                  and reconnect. Everything here stays read-only until then.
                </p>
              </div>
            ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
        Wallet
      </h2>

      <div className="mt-4 space-y-3">
        {wallets.length === 0 ? (
          <p className="text-sm text-white/50">
            No Starknet wallet detected. Private transfers need a
            privacy-enabled wallet — install{" "}
            <a
              className="text-white/80 underline underline-offset-4 hover:text-white"
              href="https://www.ready.co"
              target="_blank"
              rel="noreferrer"
            >
              Ready
            </a>
            , then reload.
          </p>
        ) : (
          <ul className="space-y-2">
            {wallets.map((wallet) => (
              <li key={wallet.name}>
                <button
                  type="button"
                  onClick={() => onConnect(wallet)}
                  disabled={status.kind === "connecting"}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-left transition hover:border-white/25 hover:bg-white/[0.04] disabled:opacity-50"
                >
                  {wallet.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wallet.icon} alt="" className="size-6 rounded" />
                  ) : null}
                  <span className="text-white">{wallet.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {status.kind === "connecting" ? (
          <div className="flex items-center gap-3 text-sm text-white/50">
            <span>Waiting for the wallet…</span>
            <button
              type="button"
              onClick={onCancelConnect}
              className="text-white/70 underline underline-offset-4 transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {status.kind === "error" ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {status.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
