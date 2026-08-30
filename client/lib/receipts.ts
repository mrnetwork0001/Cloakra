/**
 * Signed payout receipts - the auditor story without the dapp ever touching a
 * viewing key.
 *
 * After a run settles, the org's wallet signs ONE SNIP-12 typed-data message
 * (off-chain, free, one popup) committing to: the operation, the settlement tx
 * hash, the pool, and a Merkle root over salted (recipient, amount) leaves.
 * Each recipient then gets a receipt file carrying only THEIR leaf + proof -
 * a receipt reveals nothing about other recipients, and the salts stop anyone
 * brute-forcing the root against guessed address/amount pairs.
 *
 * A receipt is an ATTESTATION: it proves what the org signed, not what the
 * shielded transaction contains - the pool keeps tx contents private by
 * design, so no receipt scheme can chain-verify the transfer itself.
 * Verification is public: rebuild the leaf, walk the proof to the root,
 * check the signature against the org account onchain (SNIP-6
 * is_valid_signature via verifyMessageInStarknet), and confirm the referenced
 * tx settled AND touched the pool. No keys, no wallet, no trust in Cloakra -
 * but the receipt is exactly as trustworthy as its signer.
 */

import {
  constants,
  hash,
  merkle,
  RpcError,
  typedData as snip12,
  verifyMessageInStarknet,
  type Signature,
  type TypedData,
  type WalletAccountV6,
} from "starknet";
import { getProvider } from "./pool";
import { STRK20_POOL_ADDRESS } from "./config";
import { formatTokenAmount } from "./strk20";

export interface RunRecipient {
  /** Normalized 0x-hex address. */
  address: string;
  /** Amount in base units. */
  raw: bigint;
}

export interface PayoutReceipt {
  format: "cloakra-receipt-v1";
  operation: string;
  chainId: string;
  txHash: string;
  pool: string;
  org: string;
  recipientCount: number;
  merkleRoot: string;
  recipient: string;
  /** Base units, hex. */
  amount: string;
  amountDisplay: string;
  salt: string;
  proof: string[];
  signature: string[];
  note: string;
}

const DOMAIN = {
  name: "Cloakra",
  version: "1",
  chainId: constants.StarknetChainId.SN_MAIN,
  revision: "1",
} as const;

const toHex = (v: bigint | string): string => "0x" + BigInt(v).toString(16);

/** Poseidon leaf over (recipient, amount, salt). Salt keeps the root
 * un-brute-forceable from guessed address/amount pairs. */
export function computeLeaf(recipient: string, raw: bigint, salt: string): string {
  return hash.computePoseidonHashOnElements([recipient, raw, salt]);
}

export function randomSalt(): string {
  const bytes = new Uint8Array(31); // < 2^248 < field prime
  crypto.getRandomValues(bytes);
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** The one message the org signs. Field values are felts or short strings. */
export function buildRunTypedData(
  operation: string,
  txHash: string,
  org: string,
  recipientCount: number,
  merkleRoot: string,
): TypedData {
  return {
    types: {
      StarknetDomain: [
        { name: "name", type: "shortstring" },
        { name: "version", type: "shortstring" },
        { name: "chainId", type: "shortstring" },
        { name: "revision", type: "shortstring" },
      ],
      PayoutRun: [
        { name: "operation", type: "shortstring" },
        { name: "org", type: "felt" },
        { name: "tx_hash", type: "felt" },
        { name: "pool", type: "felt" },
        { name: "recipient_count", type: "felt" },
        { name: "merkle_root", type: "felt" },
      ],
    },
    primaryType: "PayoutRun",
    domain: DOMAIN,
    message: {
      operation,
      org,
      tx_hash: txHash,
      pool: STRK20_POOL_ADDRESS,
      recipient_count: recipientCount,
      merkle_root: merkleRoot,
    },
  };
}

export interface PreparedRun {
  typedData: TypedData;
  merkleRoot: string;
  /** Parallel to the input recipients. */
  leaves: { recipient: RunRecipient; salt: string; leaf: string }[];
  tree: InstanceType<typeof merkle.MerkleTree>;
}

export function prepareRun(
  operation: string,
  txHash: string,
  org: string,
  recipients: RunRecipient[],
): PreparedRun {
  const leaves = recipients.map((recipient) => {
    const salt = randomSalt();
    return { recipient, salt, leaf: computeLeaf(recipient.address, recipient.raw, salt) };
  });
  const tree = new merkle.MerkleTree(
    leaves.map((l) => l.leaf),
    hash.computePoseidonHash,
  );
  return {
    typedData: buildRunTypedData(operation, txHash, org, recipients.length, tree.root),
    merkleRoot: tree.root,
    leaves,
    tree,
  };
}

/** Normalize a wallet Signature (array or weierstrass object) to hex felts. */
export function normalizeSignature(signature: Signature): string[] {
  if (Array.isArray(signature)) return signature.map((s) => toHex(s));
  return [toHex(signature.r), toHex(signature.s)];
}

/** One wallet popup; returns a downloadable receipt per recipient. */
export async function signRun(
  account: WalletAccountV6,
  operation: string,
  txHash: string,
  recipients: RunRecipient[],
  expectedPayer?: string,
): Promise<PayoutReceipt[]> {
  const org = toHex(account.address);
  // The wallet can switch accounts under us - an attestation signed by the
  // wrong org account would verify green for the wrong signer.
  if (expectedPayer !== undefined && BigInt(org) !== BigInt(expectedPayer)) {
    throw new Error(
      "The wallet's active account is not the account that paid this run - switch back before signing receipts.",
    );
  }
  const prepared = prepareRun(operation, txHash, org, recipients);
  const signature = normalizeSignature(await account.signMessage(prepared.typedData));

  return prepared.leaves.map(({ recipient, salt, leaf }) => ({
    format: "cloakra-receipt-v1",
    operation,
    chainId: DOMAIN.chainId,
    txHash: toHex(txHash),
    pool: STRK20_POOL_ADDRESS,
    org,
    recipientCount: recipients.length,
    merkleRoot: prepared.merkleRoot,
    recipient: recipient.address,
    amount: toHex(recipient.raw),
    amountDisplay: `${formatTokenAmount(recipient.raw)} STRK`,
    salt,
    proof: prepared.tree.getProof(leaf),
    signature,
    note: "Share this file only with its recipient - it reveals their amount to whoever holds it. Verify at /verify.",
  }));
}

export interface ReceiptVerification {
  structure: boolean;
  merkle: boolean;
  signature: boolean | null; // null = could not reach chain
  /** SUCCEEDED_POOL = settled AND emitted STRK20 pool events. */
  transaction:
    | "SUCCEEDED_POOL"
    | "SUCCEEDED_NOT_POOL"
    | "REVERTED"
    | "NOT_FOUND"
    | "UNKNOWN";
  ok: boolean;
}

/** Full public verification - pure math plus two public RPC reads. */
export async function verifyReceipt(receipt: PayoutReceipt): Promise<ReceiptVerification> {
  const result: ReceiptVerification = {
    structure: false,
    merkle: false,
    signature: null,
    transaction: "UNKNOWN",
    ok: false,
  };
  try {
    if (receipt.format !== "cloakra-receipt-v1") return result;
    BigInt(receipt.recipient);
    BigInt(receipt.amount);
    BigInt(receipt.salt);
    BigInt(receipt.merkleRoot);
    // Stored chain/pool must be the ones the verifier rebuilds the signed
    // message with - otherwise they are decorative fields inviting false
    // assurance.
    if (BigInt(receipt.chainId) !== BigInt(DOMAIN.chainId)) return result;
    if (BigInt(receipt.pool) !== BigInt(STRK20_POOL_ADDRESS)) return result;
    result.structure = true;
  } catch {
    return result;
  }

  const leaf = computeLeaf(receipt.recipient, BigInt(receipt.amount), receipt.salt);
  result.merkle = merkle.proofMerklePath(
    receipt.merkleRoot,
    leaf,
    receipt.proof,
    hash.computePoseidonHash,
  );

  const typedData = buildRunTypedData(
    receipt.operation,
    receipt.txHash,
    receipt.org,
    receipt.recipientCount,
    receipt.merkleRoot,
  );
  try {
    result.signature = await verifyMessageInStarknet(
      getProvider(),
      typedData,
      receipt.signature,
      receipt.org,
    );
  } catch {
    result.signature = null;
  }

  try {
    const receiptTx = await getProvider().getTransactionReceipt(receipt.txHash);
    if (receiptTx.isSuccess()) {
      // A random successful tx must not lend credibility to an attestation:
      // require the settlement to have emitted STRK20 pool events. (What the
      // shielded tx DID remains private by design - this only proves it was
      // a pool transaction.)
      const events =
        (receiptTx as unknown as { events?: { from_address?: string }[] })
          .events ?? [];
      const touchedPool = events.some((e) => {
        try {
          return BigInt(e.from_address ?? "0x0") === BigInt(STRK20_POOL_ADDRESS);
        } catch {
          return false;
        }
      });
      result.transaction = touchedPool ? "SUCCEEDED_POOL" : "SUCCEEDED_NOT_POOL";
    } else if (receiptTx.isReverted()) {
      result.transaction = "REVERTED";
    }
  } catch (err) {
    result.transaction =
      err instanceof RpcError && err.isType("TXN_HASH_NOT_FOUND")
        ? "NOT_FOUND"
        : "UNKNOWN";
  }

  result.ok =
    result.structure &&
    result.merkle &&
    result.signature === true &&
    result.transaction === "SUCCEEDED_POOL";
  return result;
}

/** SNIP-12 message hash - exposed for tests and debugging. */
export function runMessageHash(typedData: TypedData, org: string): string {
  return snip12.getMessageHash(typedData, org);
}
