import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Tokamak Forest — AI-Powered Knowledge Hub for Tokamak Network",
  description:
    "Navigate the knowledge forest of Tokamak Network. AI-powered answers with real citations from every repo, doc, and resource across the ecosystem.",
  keywords: [
    "Tokamak Network",
    "knowledge base",
    "AI",
    "RAG",
    "blockchain",
    "Layer 2",
    "documentation",
  ],
  icons: {
    icon: "/icon.svg",
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
