import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
export const metadata: Metadata = {
  title: "Cloakra - Shielded Capital Allocation on Starknet",
  description:
    "Grants, bug bounties, and contributor payouts settled privately through the STRK20 privacy pool on Starknet mainnet. Who receives and how much stays private; the public legs stay public.",
  openGraph: {
    title: "Cloakra - Shielded Capital Allocation on Starknet",
    description:
      "Private team payouts, bounties, and grants over the STRK20 privacy pool - live on Starknet mainnet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-black font-[family-name:var(--font-inter)] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
