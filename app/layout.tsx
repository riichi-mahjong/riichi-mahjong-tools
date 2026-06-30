import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riichi Mahjong Tools",
  description:
    "Riichi mahjong tools, starting with a Mahjong Soul rank simulator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
      <GoogleAnalytics gaId="G-91YTQGX1G2" />
    </html>
  );
}