import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const SITE_URL = "https://tokamakforest.com";
const TITLE = "Tokamak Forest — AI-Powered Knowledge Hub for Tokamak Network";
const DESCRIPTION =
  "Navigate the knowledge forest of Tokamak Network. AI-powered answers with real citations from every repo, doc, and resource across the ecosystem.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Tokamak Network",
    "knowledge base",
    "AI",
    "RAG",
    "blockchain",
    "Layer 2",
    "documentation",
  ],
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Tokamak Forest",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@tokaboratory",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
