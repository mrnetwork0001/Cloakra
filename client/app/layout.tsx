import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloakra — Shielded Capital Allocation on Starknet",
  description:
    "Grants, bug bounties, and contributor payouts settled privately through the STRK20 privacy pool, with selective viewing keys for audit.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
