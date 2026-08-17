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

const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", "client", ".env.local");
const rpcUrl = readFileSync(envPath, "utf8")
  .split("\n")
  .find((l) => l.startsWith("NEXT_PUBLIC_STARKNET_RPC_URL="))
  ?.split("=")
  .slice(1)
  .join("=")
  .trim();
if (!rpcUrl) {
  console.error("No NEXT_PUBLIC_STARKNET_RPC_URL in client/.env.local");
  process.exit(2);
}

const res = await fetch(rpcUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "starknet_getTransactionStatus",
    params: { transaction_hash: hash },
    id: 1,
  }),
});
const body = await res.json();

if (body.error) {
  console.error(`NOT FOUND on mainnet RPC: ${JSON.stringify(body.error)}`);
  process.exit(1);
}

const { finality_status, execution_status } = body.result;
const accepted = ["ACCEPTED_ON_L2", "ACCEPTED_ON_L1"].includes(finality_status);
const succeeded = execution_status === "SUCCEEDED";

console.log(`finality:  ${finality_status}`);
console.log(`execution: ${execution_status}`);
console.log(`voyager:   https://voyager.online/tx/${hash}`);

if (accepted && succeeded) {
  console.log("VERIFIED — safe to record in strk20.json");
  process.exit(0);
}
console.error("NOT VERIFIED — do not record this hash yet");
process.exit(1);
