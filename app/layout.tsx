import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riichi Mahjong Tools",
  description: "Riichi mahjong tools and simulators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = "G-91YTQGX1G2";

  return (
    <html lang="ja">
      <body>{children}</body>
      <GoogleAnalytics gaId={gaId} />
    </html>
  );
}