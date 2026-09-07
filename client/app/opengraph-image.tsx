import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Cloakra - Shielded Capital Allocation on Starknet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social preview card. Rendered at build time - no external requests, no
 * fonts to fetch; the wordmark is embedded from public/ as a data URL.
 * Satori supports a flexbox subset only: every container with multiple
 * children declares display:flex explicitly.
 */
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "cloakra-header.png"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 2px, transparent 2px)",
          backgroundSize: "48px 48px",
          padding: 72,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${logo.toString("base64")}`}
            alt="Cloakra"
            height={64}
            width={150}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#fff",
              fontSize: 82,
              fontWeight: 600,
              letterSpacing: -2,
              lineHeight: 1.05,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Pay the team.</span>
            <span>Publish no salary table.</span>
          </div>
          <div
            style={{
              marginTop: 28,
              color: "rgba(255,255,255,0.6)",
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            Shielded grants, bounties, and contributor payouts through the STRK20
            privacy pool - live on Starknet mainnet.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {[
            "7 verified mainnet txs",
            "0 custom contracts",
            "wallet-signed, no server keys",
          ].map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                padding: "10px 22px",
                color: "rgba(255,255,255,0.7)",
                fontSize: 24,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
