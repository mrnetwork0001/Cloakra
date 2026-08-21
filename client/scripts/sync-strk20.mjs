// Copies the root strk20.json (single source of truth, hackathon-required
// location) into client/lib/ so Turbopack can import it — it refuses imports
// from outside the app root. Runs automatically via predev/prebuild.
import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
copyFileSync(join(here, "..", "..", "strk20.json"), join(here, "..", "lib", "strk20.json"));
console.log("synced strk20.json -> client/lib/");
