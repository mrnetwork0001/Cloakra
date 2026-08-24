import { describe, expect, it } from "vitest";
import { hash, merkle } from "starknet";
import {
  buildRunTypedData,
  computeLeaf,
  prepareRun,
  randomSalt,
  runMessageHash,
} from "@/lib/receipts";

const ORG = "0x" + "a".repeat(60);
const R1 = { address: "0x" + "1".repeat(60), raw: 5n * 10n ** 18n };
const R2 = { address: "0x" + "2".repeat(60), raw: 3n * 10n ** 18n };
const R3 = { address: "0x" + "3".repeat(60), raw: 1n };
const TX = "0x" + "f".repeat(60);

describe("computeLeaf", () => {
  it("is deterministic and salt-sensitive", () => {
    const salt = "0x1234";
    expect(computeLeaf(R1.address, R1.raw, salt)).toBe(computeLeaf(R1.address, R1.raw, salt));
    expect(computeLeaf(R1.address, R1.raw, "0x1235")).not.toBe(
      computeLeaf(R1.address, R1.raw, salt),
    );
    expect(computeLeaf(R2.address, R1.raw, salt)).not.toBe(computeLeaf(R1.address, R1.raw, salt));
  });
});

describe("randomSalt", () => {
  it("stays below the field prime and varies", () => {
    const PRIME = 2n ** 251n + 17n * 2n ** 192n + 1n;
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const s = randomSalt();
      expect(BigInt(s) < PRIME).toBe(true);
      seen.add(s);
    }
    expect(seen.size).toBe(50);
  });
});

describe("prepareRun", () => {
  it("every recipient's proof verifies against the signed root", () => {
    const run = prepareRun("StealthSplit", TX, ORG, [R1, R2, R3]);
    for (const { leaf } of run.leaves) {
      const proof = run.tree.getProof(leaf);
      expect(merkle.proofMerklePath(run.merkleRoot, leaf, proof, hash.computePoseidonHash)).toBe(
        true,
      );
    }
  });

  it("a tampered amount fails the proof", () => {
    const run = prepareRun("StealthSplit", TX, ORG, [R1, R2]);
    const { recipient, salt } = run.leaves[0];
    const tampered = computeLeaf(recipient.address, recipient.raw + 1n, salt);
    const proof = run.tree.getProof(run.leaves[0].leaf);
    expect(merkle.proofMerklePath(run.merkleRoot, tampered, proof, hash.computePoseidonHash)).toBe(
      false,
    );
  });

  it("single-recipient runs work (root is the leaf)", () => {
    const run = prepareRun("GhostBounty payout", TX, ORG, [R1]);
    expect(run.leaves).toHaveLength(1);
    expect(
      merkle.proofMerklePath(
        run.merkleRoot,
        run.leaves[0].leaf,
        run.tree.getProof(run.leaves[0].leaf),
        hash.computePoseidonHash,
      ),
    ).toBe(true);
  });
});

describe("SNIP-12 message", () => {
  it("hashes deterministically and binds every field", () => {
    const base = buildRunTypedData("StealthSplit", TX, ORG, 3, "0xabc");
    const h = (td: typeof base) => runMessageHash(td, ORG);
    expect(h(base)).toBe(h(buildRunTypedData("StealthSplit", TX, ORG, 3, "0xabc")));
    expect(h(buildRunTypedData("StealthGrant round", TX, ORG, 3, "0xabc"))).not.toBe(h(base));
    expect(h(buildRunTypedData("StealthSplit", "0x" + "e".repeat(60), ORG, 3, "0xabc"))).not.toBe(
      h(base),
    );
    expect(h(buildRunTypedData("StealthSplit", TX, ORG, 4, "0xabc"))).not.toBe(h(base));
    expect(h(buildRunTypedData("StealthSplit", TX, ORG, 3, "0xabd"))).not.toBe(h(base));
  });
});
