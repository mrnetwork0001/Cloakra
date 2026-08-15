"use client";

import { useCallback, useEffect, useState } from "react";
import { constants, type WalletAccountV6 } from "starknet";
import {
  connectWallet,
  listWallets,
  subscribeWallets,
  type DiscoveredWallet,
} from "@/lib/wallet";
import { shorten, voyagerContract, STRK20_POOL_ADDRESS } from "@/lib/config";

const SN_MAIN = constants.StarknetChainId.SN_MAIN;

type Status =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "connected"; account: WalletAccountV6; chainId: string }
  | { kind: "error"; message: string };

export default function WalletPanel() {
  const [wallets, setWallets] = useState<readonly DiscoveredWallet[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [switching, setSwitching] = useState(false);

  // Extensions inject asynchronously, so seed once then follow the store.
  useEffect(() => {
    setWallets(listWallets());
    return subscribeWallets(setWallets);
  }, []);

  const onConnect = useCallback(async (wallet: DiscoveredWallet) => {
    setStatus({ kind: "connecting" });
    try {
      const account = await connectWallet(wallet);
      // getChainId lives on the provider — this reports the chain of the
      // configured RPC endpoint, which is what our reads run against.
      const chainId = await account.provider.getChainId();
      setStatus({ kind: "connected", account, chainId });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const onSwitchChain = useCallback(async () => {
    if (status.kind !== "connected") return;
    setSwitching(true);
    try {
      await status.account.switchStarknetChain(SN_MAIN);
      const chainId = await status.account.provider.getChainId();
      setStatus({ ...status, chainId });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSwitching(false);
    }
  }, [status]);

  if (status.kind === "connected") {
    const wrongChain = status.chainId !== SN_MAIN;

    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-sm font-medium tracking-wide text-white/50 uppercase">
          Wallet
        </h2>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`size-2 shrink-0 rounded-full ${wrongChain ? "bg-amber-400" : "bg-emerald-400"}`}
            />
            <code className="text-lg text-white">
              {shorten(status.account.address, 10, 6)}
            </code>
          </div>

          {wrongChain ? (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-3 text-sm text-amber-200">
              <p>
                Cloakra settles on Starknet mainnet. The connected RPC reports{" "}
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
            No Starknet wallet detected. Install Argent X or Braavos, then reload.
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

        {status.kind === "error" ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {status.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
