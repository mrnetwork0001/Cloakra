import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cloakra",
    short_name: "Cloakra",
    description:
      "Shielded grants, bounties, and contributor payouts through the STRK20 privacy pool on Starknet mainnet.",
    start_url: "/app",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [{ src: "/icon.png", sizes: "1254x1254", type: "image/png" }],
  };
}
