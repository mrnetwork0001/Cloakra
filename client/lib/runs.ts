/**
 * The last settled payout run, kept module-side. Exists because the run's
 * recipient list is UNRECOVERABLE once component state dies - the settlement
 * tx is shielded, so the chain cannot reproduce who was paid what. Without
 * this store, Back / a tab switch / an account switch silently destroys the
 * only chance to ever sign receipts for a run.
 *
 * Memory-only by design: a reload still loses it, and the UI says so. Nothing
 * here is persisted to disk or sent anywhere.
 */

import type { RunRecipient } from "./receipts";

export interface SettledRun {
  operation: string;
  txHash: string;
  /** The account that signed the settlement - only it may sign receipts. */
  payer: string;
  recipients: RunRecipient[];
  /** "confirmed" = receipt-ready; "submitted" = user must confirm on the
   * explorer before attesting. */
  outcomeKind: "confirmed" | "submitted";
  /** Set once receipts have been signed, to relabel the offer. */
  signed: boolean;
}

let current: SettledRun | null = null;
const listeners = new Set<() => void>();

export function recordRun(run: Omit<SettledRun, "signed">): void {
  current = { ...run, signed: false };
  listeners.forEach((l) => l());
}

export function markRunSigned(): void {
  if (current) {
    current = { ...current, signed: true };
    listeners.forEach((l) => l());
  }
}

export function getRun(): SettledRun | null {
  return current;
}

export function getRunServerSnapshot(): null {
  return null;
}

export function subscribeRun(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
