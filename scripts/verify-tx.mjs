#!/usr/bin/env node
// Verify a Starknet mainnet tx hash before it is allowed into strk20.json.
// Usage: node scripts/verify-tx.mjs 0x<hash>
// Exits 0 only for ACCEPTED_ON_L2/L1 + SUCCEEDED on our mainnet RPC.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hash = process.argv[2];
if (!hash || !/^0x[0-9a-fA-F]+$/.test(hash)) {
  console.error("Usage: node scripts/verify-tx.mjs 0x<tx-hash>");
  process.exit(2);
}

// The project key may be origin-allowlisted (browser-only) - that's correct
// key hygiene, but it blocks CLI use. Tx status is public data, so fall back
// to public endpoints when the env key is absent or rejects us.
const PUBLIC_RPCS = [
  "https://starknet-rpc.publicnode.com",
  "https://api.zan.top/public/starknet-mainnet",
];

const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", "client", ".env.local");
let envUrl;
try {
  envUrl = readFileSync(envPath, "utf8")
    .split("\n")
    .find((l) => l.startsWith("NEXT_PUBLIC_STARKNET_RPC_URL="))
    ?.split("=")
    .slice(1)
    .join("=")
    .trim();
} catch {
  /* no env file - public RPCs only */
}
const candidates = [...(envUrl ? [envUrl] : []), ...PUBLIC_RPCS];

const POOL = 0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812an;

async function rpc(method, params) {
  let lastError;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
      });
      const body = await res.json();
      // Allowlist rejections and auth errors: try the next endpoint. A clean
      // JSON-RPC error (e.g. hash not found) is a real answer - return it.
      if (body.error && /whitelist|origin|unauthorized|api key|no longer available/i.test(String(body.error.message))) {
        lastError = body.error;
        continue;
      }
      return body;
    } catch (err) {
      lastError = err;
    }
  }
  return { error: { message: `all RPC endpoints failed: ${lastError?.message ?? lastError}` } };
}

const status = await rpc("starknet_getTransactionStatus", { transaction_hash: hash });
if (status.error) {
  console.error(`NOT FOUND on mainnet RPC: ${JSON.stringify(status.error)}`);
  process.exit(1);
}

const { finality_status, execution_status } = status.result;
const accepted = ["ACCEPTED_ON_L2", "ACCEPTED_ON_L1"].includes(finality_status);
const succeeded = execution_status === "SUCCEEDED";

// The sprint's requirement is hashes that TOUCHED the pool - a merely
// successful transaction is not enough. Require at least one event emitted
// by the pool contract.
const receipt = await rpc("starknet_getTransactionReceipt", { transaction_hash: hash });
const events = receipt.result?.events ?? [];
const touchedPool = events.some((e) => {
  try {
    return BigInt(e.from_address) === POOL;
  } catch {
    return false;
  }
});

console.log(`finality:  ${finality_status}`);
console.log(`execution: ${execution_status}`);
console.log(`pool:      ${touchedPool ? "touched the STRK20 pool" : "did NOT touch the pool"}`);
console.log(`voyager:   https://voyager.online/tx/${hash}`);

if (accepted && succeeded && touchedPool) {
  console.log("VERIFIED - safe to record in strk20.json");
  process.exit(0);
}
console.error("NOT VERIFIED - do not record this hash");
process.exit(1);
