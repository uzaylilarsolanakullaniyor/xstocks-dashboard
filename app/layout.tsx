import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "xStocks xPoints Paneli",
  description:
    "xStocks xPoints puanlarını, portföy değerini ve strateji senaryolarını takip eden kişisel panel.",
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <div className="aurora" aria-hidden />
        {children}
      </body>
    </html>
  );
}
