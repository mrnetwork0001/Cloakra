/**
 * Module-level record of the most recent STRK20 submission. Exists because an
 * in-wallet account switch remounts the panels mid-submit (deliberately — it
 * clears forms), which would otherwise discard an in-flight tx outcome and
 * leave the user with no hash to check before resubmitting real funds.
 */

import type { SubmitOutcome } from "./strk20";

export interface LastSubmission {
  operation: string;
  txHash: string;
  kind: SubmitOutcome["kind"] | "pending";
}

let last: LastSubmission | null = null;
const listeners = new Set<() => void>();

export function recordSubmission(submission: LastSubmission): void {
  last = submission;
  listeners.forEach((listener) => listener());
}

export function getLastSubmission(): LastSubmission | null {
  return last;
}

export function getServerSnapshot(): null {
  return null;
}

export function subscribeLastSubmission(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
