"use client";

import { useCallback, useRef, useState } from "react";
import { assessPrivacy, type PrivacyWarning } from "@/lib/privacy";

export interface PrivacyGate {
  warnings: PrivacyWarning[] | null;
  checking: boolean;
  /** True = proceed. False = warnings are showing; the panel's submit must be
   * re-invoked with force=true by the user's explicit choice. */
  passes: (
    amounts: bigint[],
    kind: "transfer" | "withdraw",
    options?: { toSelf?: boolean },
  ) => Promise<boolean>;
  clear: () => void;
}

export function usePrivacyGate(address: string): PrivacyGate {
  const [warnings, setWarnings] = useState<PrivacyWarning[] | null>(null);
  const [checking, setChecking] = useState(false);
  // Latest-wins: an edit or a newer check makes older resolutions stale so
  // they can never paint warnings for amounts the user no longer intends.
  const runRef = useRef(0);

  const clear = useCallback(() => {
    runRef.current++;
    setWarnings(null);
    setChecking(false);
  }, []);

  const passes = useCallback(
    async (
      amounts: bigint[],
      kind: "transfer" | "withdraw",
      options?: { toSelf?: boolean },
    ) => {
      const run = ++runRef.current;
      setChecking(true);
      try {
        const found = await assessPrivacy(address, amounts, kind, options);
        if (runRef.current !== run) return false; // superseded - stay silent
        if (found.length === 0) return true;
        setWarnings(found);
        return false;
      } catch {
        if (runRef.current !== run) return false;
        // The check must never brick a send - but failing silently would be
        // dishonest. Surface it and let the user proceed deliberately.
        setWarnings([
          {
            severity: "medium",
            message:
              "The privacy check could not run (RPC unreachable). You can proceed without it.",
          },
        ]);
        return false;
      } finally {
        if (runRef.current === run) setChecking(false);
      }
    },
    [address],
  );

  return { warnings, checking, passes, clear };
}

/**
 * The warning box + decision buttons. `onProceed` must re-invoke the panel's
 * submit with force=true - an explicit parameter, so an approval can never
 * outlive the exact submission it was granted for.
 */
export function PrivacyWarnings({
  gate,
  onProceed,
  proceedLabel = "Send anyway",
  disabled = false,
}: {
  gate: PrivacyGate;
  onProceed: () => void;
  proceedLabel?: string;
  disabled?: boolean;
}) {
  if (!gate.warnings) return null;
  return (
    <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
      <p className="text-xs font-medium tracking-wide text-amber-200/80 uppercase">
        Privacy check
      </p>
      <ul className="mt-2 space-y-1.5">
        {gate.warnings.map((w, i) => (
          <li key={`${i}-${w.message.slice(0, 24)}`} className="text-sm text-amber-100/90">
            {w.message}
        </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-200/60">
        A bounded check, not a privacy analysis: it compares approximate
        amounts and timing against public pool legs from the last ~day - your
        own, and for an unshield, other accounts&apos; deposits and the
        pool&apos;s crowd. Longer history and patterns across accounts are
        outside it. Small tweaks to the amount do <strong>not</strong> help -
        observers match approximately too. Waiting longer does.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            gate.clear();
            onProceed();
          }}
          className="rounded-md border border-amber-400/40 px-3 py-1.5 text-sm font-medium text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-50"
        >
          {proceedLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={gate.clear}
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
