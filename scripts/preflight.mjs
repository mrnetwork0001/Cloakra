#!/usr/bin/env node
// Submission preflight — run before submitting to the sprint.
// Usage: node scripts/preflight.mjs
// Exits 0 only when every REQUIRED check passes. Warns on should-fix items.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Pass the live demo URL to check public reachability:
//   node scripts/preflight.mjs --demo-url https://<host>
// It is deliberately NOT stored in this repo — supply it at run time.
const demoUrlArg = (() => {
  const i = process.argv.indexOf("--demo-url");
  return i !== -1 ? process.argv[i + 1] : undefined;
})();
const POOL = 0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812an;
const PUBLIC_RPCS = [
  "https://rpc.starknet.lava.build",
  "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_10/demo",
];

const results = [];
const record = (name, ok, detail = "", required = true) => {
  results.push({ name, ok, detail, required });
  const mark = ok ? "✓" : required ? "✗" : "⚠";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
};

async function rpc(method, params) {
  let lastError;
  for (const url of PUBLIC_RPCS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "cloakra-preflight/1.0" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
      });
      const body = await res.json();
      if (body.error && /whitelist|origin|unauthorized|api key|no longer available/i.test(String(body.error.message))) {
        lastError = body.error;
        continue;
      }
      return body;
    } catch (err) {
      lastError = err;
    }
  }
  return { error: { message: `all endpoints failed: ${lastError?.message ?? lastError}` } };
}

// ---- strk20.json shape ----
let manifest;
try {
  manifest = JSON.parse(readFileSync(join(root, "strk20.json"), "utf8"));
  record("strk20.json parses", true);
} catch (e) {
  record("strk20.json parses", false, String(e.message));
  process.exit(1);
}

const keys = Object.keys(manifest).sort().join(",");
record(
  "strk20.json has exactly the four hub fields",
  keys === "contracts,demo_url,demo_video,transactions",
  keys,
);
record(
  "three or more transactions recorded",
  Array.isArray(manifest.transactions) && manifest.transactions.length >= 3,
  `${manifest.transactions?.length ?? 0} recorded`,
);
record(
  "demo_video filled",
  typeof manifest.demo_video === "string" && manifest.demo_video.length > 0,
  manifest.demo_video ? manifest.demo_video : "EMPTY — required before submitting",
  false, // warn until video day, but the final run must show ✓
);

// ---- every hash: accepted + succeeded + pool-touching ----
for (const hash of manifest.transactions ?? []) {
  const short = hash.slice(0, 12) + "…";
  const status = await rpc("starknet_getTransactionStatus", { transaction_hash: hash });
  if (status.error) {
    record(`tx ${short} exists on mainnet`, false, JSON.stringify(status.error));
    continue;
  }
  const accepted = ["ACCEPTED_ON_L2", "ACCEPTED_ON_L1"].includes(status.result.finality_status);
  const succeeded = status.result.execution_status === "SUCCEEDED";
  const receipt = await rpc("starknet_getTransactionReceipt", { transaction_hash: hash });
  const touchedPool = (receipt.result?.events ?? []).some((e) => {
    try {
      return BigInt(e.from_address) === POOL;
    } catch {
      return false;
    }
  });
  record(
    `tx ${short} accepted + succeeded + pool-touching`,
    accepted && succeeded && touchedPool,
    `${status.result.finality_status} · ${status.result.execution_status} · pool:${touchedPool}`,
  );
}

// ---- repo hygiene ----
record("LICENSE present", existsSync(join(root, "LICENSE")));
record(
  "no private planning docs tracked",
  !existsSync(join(root, ".git")) ||
    !["CLOAKRA_BUILD_DAYS.md", "DEMO_SCRIPT.md"].some((f) => {
      try {
        // tracked = exists AND not ignored; a pure existence check suffices
        // here because both files are gitignored — this guards against the
        // ignore rules being accidentally removed.
        const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
        return existsSync(join(root, f)) && !gitignore.includes(f);
      } catch {
        return true;
      }
    }),
);

// ---- live demo reachable WITHOUT auth ----
if (demoUrlArg) {
  try {
    const res = await fetch(demoUrlArg, { redirect: "follow" });
    const body = await res.text();
    // Vercel's protection wall answers 401/403, or serves an SSO interstitial.
    const walled =
      res.status === 401 ||
      res.status === 403 ||
      /vercel.*(authentication|sso)|_vercel\/sso/i.test(body);
    record(
      "demo URL is publicly reachable (deployment protection OFF)",
      res.ok && !walled,
      walled ? `HTTP ${res.status} — still behind deployment protection` : `HTTP ${res.status}`,
    );
    record(
      "demo page renders Cloakra content",
      /Cloakra/.test(body),
      "",
    );
  } catch (e) {
    record("demo URL is publicly reachable", false, String(e.message));
  }
} else {
  record(
    "demo URL reachability",
    false,
    "not checked — re-run with --demo-url <url> before submitting",
    false,
  );
}

// ---- verdict ----
const failedRequired = results.filter((r) => r.required && !r.ok);
const warns = results.filter((r) => !r.required && !r.ok);
console.log("");
if (failedRequired.length === 0) {
  console.log(
    warns.length
      ? `PREFLIGHT PASSED with ${warns.length} warning(s) — resolve before final submission.`
      : "PREFLIGHT PASSED — ready to submit.",
  );
  process.exit(0);
}
console.error(`PREFLIGHT FAILED — ${failedRequired.length} required check(s) failed.`);
process.exit(1);
