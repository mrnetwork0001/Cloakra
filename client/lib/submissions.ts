/**
 * Module-level record of STRK20 submissions. Exists because panels unmount
 * mid-submit (tab switches, account switches — deliberate, they clear forms),
 * which would otherwise discard in-flight tx state and invite duplicate
 * payments of real funds.
 *
 * Lifecycle per submission: "signing" (wallet popup open, no hash yet) →
 * "pending" (broadcast, awaiting receipt) → settled (confirmed / reverted /
 * failed / submitted), or "not_sent" if the wallet call throws pre-broadcast.
 * While any entry is signing/pending the store reports busy, and the app
 * locks tab navigation + submits so no second operation can start.
 */

import type { SubmitOutcome } from "./strk20";

export type SubmissionKind =
  | "signing"
  | "pending"
  | "not_sent"
  | SubmitOutcome["kind"];

export interface Submission {
  id: number;
  operation: string;
  /** Empty until the wallet returns a hash. */
  txHash: string;
  kind: SubmissionKind;
}

let nextId = 1;
const entries = new Map<number, Submission>();
const listeners = new Set<() => void>();

const EMPTY: Submission[] = [];
let snapshot: Submission[] = EMPTY;

function emit(): void {
  // Keep only what the UI needs: everything unsettled, plus the last settled.
  const all = [...entries.values()];
  const active = all.filter((s) => s.kind === "signing" || s.kind === "pending");
  const settled = all.filter((s) => s.kind !== "signing" && s.kind !== "pending");
  const lastSettled = settled.length ? [settled[settled.length - 1]] : [];
  for (const s of settled.slice(0, -1)) entries.delete(s.id);
  snapshot = [...active, ...lastSettled];
  listeners.forEach((listener) => listener());
}

export function beginSubmission(operation: string): number {
  const id = nextId++;
  entries.set(id, { id, operation, txHash: "", kind: "signing" });
  emit();
  return id;
}

export function updateSubmission(
  id: number,
  patch: Partial<Pick<Submission, "txHash" | "kind">>,
): void {
  const existing = entries.get(id);
  if (!existing) return;
  entries.set(id, { ...existing, ...patch });
  emit();
}

export function getSubmissions(): Submission[] {
  return snapshot;
}

export function getServerSnapshot(): Submission[] {
  return EMPTY;
}

/** True while any submission is signing or awaiting its receipt. */
export function isBusy(): boolean {
  return snapshot.some((s) => s.kind === "signing" || s.kind === "pending");
}

export function subscribeSubmissions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
