import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const thai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "สมัครงาน · B-smart และ แง่ดี ครีเอทีฟ",
  description: "กรอกใบสมัครงานออนไลน์ บริษัท ที.เอส.พริ้นท์ติ้ง 2002 จำกัด (B-smart) และ บริษัท แง่ดี ครีเอทีฟ จำกัด",
};

export const viewport: Viewport = {
  themeColor: "#f6f5f3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={`${thai.variable} antialiased`}>{children}</body>
    </html>
  );
}
