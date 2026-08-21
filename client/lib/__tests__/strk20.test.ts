import { describe, expect, it } from "vitest";
import {
  formatTokenAmount,
  formatTokenAmountExact,
  parseAddress,
  parseTokenAmount,
  sameFelt,
  walletErrorKind,
  walletErrorMessage,
} from "@/lib/strk20";

const STRK = 10n ** 18n;

describe("parseTokenAmount", () => {
  it("parses integers and decimals", () => {
    expect(parseTokenAmount("26")).toBe(26n * STRK);
    expect(parseTokenAmount("12.5")).toBe(12n * STRK + STRK / 2n);
    expect(parseTokenAmount(" 2 ")).toBe(2n * STRK);
  });
  it("rejects malformed input", () => {
    for (const bad of ["", ".", ".5", "1.", "1e5", "1,5", "-1", "0x10", "abc", "1 2"]) {
      expect(() => parseTokenAmount(bad), bad).toThrow();
    }
  });
  it("rejects zero and too many decimals", () => {
    expect(() => parseTokenAmount("0")).toThrow();
    expect(() => parseTokenAmount("0.0000000000000000001")).toThrow(); // 19 dp
    expect(parseTokenAmount("0.000000000000000001")).toBe(1n); // 18 dp ok
  });
});

describe("formatTokenAmount", () => {
  it("formats wholes and truncated decimals", () => {
    expect(formatTokenAmount(26n * STRK)).toBe("26");
    expect(formatTokenAmount(12n * STRK + STRK / 2n)).toBe("12.5");
    expect(formatTokenAmount(1_2345n * STRK / 10_000n)).toBe("1.2345");
  });
  it("never renders a nonzero balance as 0", () => {
    expect(formatTokenAmount(0n)).toBe("0");
    expect(formatTokenAmount(1n)).toBe("< 0.0001");
    expect(formatTokenAmount(99_999_999_999_999n)).toBe("< 0.0001");
  });
});

describe("formatTokenAmountExact", () => {
  it("round-trips through parseTokenAmount", () => {
    for (const raw of [1n, 26n * STRK, 12n * STRK + STRK / 2n, 38_246_000_000_000_000_000n]) {
      expect(parseTokenAmount(formatTokenAmountExact(raw))).toBe(raw);
    }
  });
});

describe("sameFelt", () => {
  it("treats felt spellings as equal", () => {
    expect(sameFelt("0x0a", "0xA")).toBe(true);
    expect(
      sameFelt(
        "0x017a635c150f53f0c8a110839fef27995c7e902152313df144c47739e7849f35",
        "0x17A635C150F53F0C8A110839FEF27995C7E902152313DF144C47739E7849F35",
      ),
    ).toBe(true);
    expect(sameFelt("0x1", "0x2")).toBe(false);
    expect(sameFelt("garbage", "0x1")).toBe(false);
  });
});

describe("parseAddress", () => {
  const PRIME = 2n ** 251n + 17n * 2n ** 192n + 1n;
  it("normalizes valid addresses", () => {
    expect(parseAddress("0x0A")).toBe("0xa");
    expect(parseAddress(" 0x017a635c150F53f0c8A110839FEF27995C7e902152313df144C47739e7849F35 ")).toBe(
      "0x17a635c150f53f0c8a110839fef27995c7e902152313df144c47739e7849f35",
    );
  });
  it("rejects the zero address and non-hex", () => {
    expect(() => parseAddress("0x0")).toThrow();
    expect(() => parseAddress("hello")).toThrow();
    expect(() => parseAddress("0x")).toThrow();
  });
  it("rejects felts at or above the field prime (prime aliases zero)", () => {
    expect(() => parseAddress("0x" + PRIME.toString(16))).toThrow();
    expect(() => parseAddress("0x" + "f".repeat(64))).toThrow();
    expect(parseAddress("0x" + (PRIME - 1n).toString(16))).toBeTruthy();
  });
});

describe("walletErrorKind", () => {
  it("classifies typed wallet-api codes", () => {
    expect(walletErrorKind({ code: 118, message: "An error occurred (NOT_REGISTERED)" })).toBe(
      "not_registered",
    );
    expect(
      walletErrorKind({ code: 119, message: "An error occurred (INSUFFICIENT_PRIVATE_BALANCE)" }),
    ).toBe("insufficient_private");
  });
  it("classifies refusals from message text, on Error or plain objects", () => {
    expect(walletErrorKind(new Error("User rejected request"))).toBe("refused");
    expect(walletErrorKind({ message: "USER_REFUSED_OP" })).toBe("refused");
    expect(walletErrorKind({ message: "Permission denied" })).toBe("refused");
  });
  it("does NOT classify aborts as refusals (infra timeouts must not read as declines)", () => {
    expect(walletErrorKind(new Error("The user aborted a request"))).toBe("unknown");
    expect(walletErrorKind({ name: "AbortError", message: "Request aborted" })).toBe("unknown");
  });
  it("code takes precedence over refusal-looking text", () => {
    expect(walletErrorKind({ code: 118, message: "request rejected (NOT_REGISTERED)" })).toBe(
      "not_registered",
    );
  });
});

describe("walletErrorMessage", () => {
  it("extracts from Error, plain objects, and primitives", () => {
    expect(walletErrorMessage(new Error("boom"))).toBe("boom");
    expect(walletErrorMessage({ code: 118, message: "typed" })).toBe("typed");
    expect(walletErrorMessage("plain string")).toBe("plain string");
    expect(walletErrorMessage(null)).toBe("null");
  });
});
