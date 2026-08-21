import { describe, expect, it } from "vitest";
import { parseRecipientsCsv } from "@/lib/csv";

const A = "0x" + "1".repeat(60);
const B = "0x" + "2".repeat(60);
const C = "0x" + "3".repeat(60);

describe("parseRecipientsCsv", () => {
  it("parses comma, semicolon, tab, and whitespace separators", () => {
    const { recipients, errors } = parseRecipientsCsv(
      `${A}, 12.5\n${B};7\n${C}\t3`,
      10,
    );
    expect(errors).toEqual([]);
    expect(recipients).toHaveLength(3);
    expect(recipients[0].amount).toBe("12.5");
  });

  it("skips blanks and #-comments", () => {
    const { recipients, errors } = parseRecipientsCsv(
      `# team payroll\n\n${A}, 5`,
      10,
    );
    expect(errors).toEqual([]);
    expect(recipients).toHaveLength(1);
  });

  it("NEVER silently skips a header — errors with a hint instead", () => {
    const { recipients, errors } = parseRecipientsCsv(
      `address, amount\n${A}, 5`,
      10,
    );
    expect(recipients).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^line 1/);
    expect(errors[0]).toMatch(/header/);
  });

  it("does not swallow a corrupt 0x-less first data row (silent-underpay guard)", () => {
    const { recipients, errors } = parseRecipientsCsv(
      `${"1".repeat(60)}, 5\n${B}, 7`,
      10,
    );
    expect(recipients).toHaveLength(1); // only B
    expect(errors).toHaveLength(1); // the corrupt row is LOUD, not skipped
    expect(errors[0]).toMatch(/^line 1/);
  });

  it("accepts uppercase 0X prefixes (exporters uppercase hex)", () => {
    const { recipients, errors } = parseRecipientsCsv(`0X${"a".repeat(60)}, 5`, 10);
    expect(errors).toEqual([]);
    expect(recipients).toHaveLength(1);
  });

  it("does not collapse empty CSV fields into the next column", () => {
    const { recipients, errors } = parseRecipientsCsv(`${A},,3000`, 10);
    expect(recipients).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/got 3 value/);
  });

  it("handles CR-only line endings with correct line numbers", () => {
    const { recipients, errors } = parseRecipientsCsv(`${A}, 5\rbad-row, 7`, 10);
    expect(recipients).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^line 2/);
  });

  it("reports per-line errors with line numbers and keeps valid rows", () => {
    const { recipients, errors } = parseRecipientsCsv(
      `${A}, 5\nnot-an-address, 5\n${B}, zero.amount\n${C}, 1, extra`,
      10,
    );
    expect(recipients).toHaveLength(1);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toMatch(/^line 2/);
    expect(errors[1]).toMatch(/^line 3/);
    expect(errors[2]).toMatch(/^line 4/);
  });

  it("rejects duplicate addresses across felt spellings", () => {
    const { recipients, errors } = parseRecipientsCsv(
      `${A}, 5\n0x0${A.slice(2)}, 6`,
      10,
    );
    expect(recipients).toHaveLength(1);
    expect(errors[0]).toMatch(/duplicate/);
  });

  it("enforces the row cap by rejecting the whole batch", () => {
    const lines = Array.from({ length: 11 }, (_, i) => `0x${(i + 1).toString(16)}${"a".repeat(40)}, 1`);
    const { recipients, errors } = parseRecipientsCsv(lines.join("\n"), 10);
    expect(recipients).toEqual([]);
    expect(errors.some((e) => /capped at 10/.test(e))).toBe(true);
  });

  it("rejects the field prime, zero address, and felt-unrepresentable amounts", () => {
    const PRIME = 2n ** 251n + 17n * 2n ** 192n + 1n;
    const { recipients, errors } = parseRecipientsCsv(
      `0x${PRIME.toString(16)}, 5\n0x0, 5\n${A}, ${PRIME.toString()}`,
      10,
    );
    expect(recipients).toEqual([]);
    expect(errors).toHaveLength(3);
  });
});
