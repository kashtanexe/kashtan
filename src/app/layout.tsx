import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FILTR: the vendor desk for busy executives", template: "%s · FILTR" },
  description:
    "Cold pitches answer 4 questions before they reach you. AI scores them against your quarterly priorities; you only see the few that matter, as one-glance Baseball Cards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
