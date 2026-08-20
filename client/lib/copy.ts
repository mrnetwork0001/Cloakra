/**
 * Protocol-fact copy shared across panels. These are facts, not decoration —
 * if the pool changes them, they change here once.
 */
export const COPY = {
  noteMaturity:
    "Freshly shielded notes mature for ~10 blocks before they can be spent.",
  recipientPrereq:
    "Recipients need a privacy-enabled wallet (Ready) with private tokens enabled — a one-time in-wallet step whose flow deposits 6 STRK that the pool fee consumes.",
  accountChanged:
    "The wallet's active account changed — review the form and try again.",
} as const;
