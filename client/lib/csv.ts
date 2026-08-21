/**
 * CSV payroll parsing for split flows. Pure and testable — every row passes
 * the same validators the form uses (parseAddress bounds + normalization,
 * parseTokenAmount), so pasting can't smuggle in anything typing couldn't.
 *
 * Accepted line shape: `address, amount` — separator is comma/semicolon/tab
 * (empty fields are NOT collapsed — a 3-column export errors instead of
 * paying the wrong column), or whitespace when no delimiter is present.
 * Blank lines and #-comments are skipped. There is NO header guessing: a
 * header row errors with a hint to delete it or prefix it with # — silent
 * skipping was a silent-underpayment bug.
 */

import { parseAddress, parseTokenAmount, sameFelt } from "./strk20";

export interface CsvRecipient {
  address: string;
  /** Original amount string, re-validated by the form on submit. */
  amount: string;
}

export interface CsvParseResult {
  recipients: CsvRecipient[];
  errors: string[];
}

const HEADER_HINT = " (if this is a header row, delete it or prefix it with #)";

export function parseRecipientsCsv(
  text: string,
  maxRows: number,
): CsvParseResult {
  const recipients: CsvRecipient[] = [];
  const errors: string[] = [];

  // All line-ending conventions, including CR-only and unicode separators —
  // otherwise every row lands on "line 1" and the errors mislead.
  const rawLines = text.split(/\r\n|\r|\n|\u2028|\u2029/);
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    const lineNo = i + 1;
    if (!line || line.startsWith("#")) continue;

    // Delimited split preserves empty fields; whitespace only as fallback.
    const hasDelimiter = /[,;\t]/.test(line);
    const parts = hasDelimiter
      ? line.split(/[,;\t]/).map((p) => p.trim())
      : line.split(/\s+/).filter(Boolean);
    const hint = lineNo === 1 ? HEADER_HINT : "";
    if (parts.length !== 2 || parts.some((p) => !p)) {
      errors.push(
        `line ${lineNo}: expected "address, amount" — got ${parts.length} value(s)${hint}`,
      );
      continue;
    }
    try {
      const address = parseAddress(parts[0]);
      parseTokenAmount(parts[1]); // validate; keep the original string
      if (recipients.some((r) => sameFelt(r.address, address))) {
        errors.push(`line ${lineNo}: duplicate address`);
        continue;
      }
      recipients.push({ address, amount: parts[1] });
    } catch (err) {
      errors.push(`line ${lineNo}: ${(err as Error).message}${hint}`);
    }
  }

  if (recipients.length > maxRows) {
    errors.push(
      `${recipients.length} recipients — the pool batch is capped at ${maxRows} per split. Split the round into batches.`,
    );
    return { recipients: [], errors };
  }
  return { recipients, errors };
}
