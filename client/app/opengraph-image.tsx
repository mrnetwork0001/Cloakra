import { ImageResponse } from "next/og";

export const alt = "Cloakra - Shielded Capital Allocation on Starknet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social preview card. Rendered at build time - no external requests, no
 * fonts to fetch. Satori supports a flexbox subset only: every container
 * with multiple children declares display:flex explicitly.
 */
export default async function OpengraphImage() {
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
          padding: 72,
          position: "relative",
        }}
      >
        {/* Aurora wash - the one place colour lives, as on the site */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 760,
            height: 620,
            display: "flex",
            background:
              "radial-gradient(closest-side, rgba(52,211,153,0.42), transparent), radial-gradient(closest-side, rgba(139,92,246,0.34), transparent)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <path
              d="M16 5l9 3.5v7c0 5.5-3.8 9.6-9 11.5-5.2-1.9-9-6-9-11.5v-7L16 5z"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="15.5" r="3.2" fill="#fff" />
          </svg>
          <div style={{ color: "#fff", fontSize: 34, fontWeight: 600 }}>Cloakra</div>
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
            "3 verified mainnet txs",
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
