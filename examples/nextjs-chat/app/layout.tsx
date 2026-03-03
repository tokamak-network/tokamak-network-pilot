import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tokamak Pilot Chat',
  description:
    'Ask questions about the Tokamak Network ecosystem — powered by Tokamak Pilot',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen bg-[#0a0a1a] text-white antialiased">
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex shrink-0 items-center gap-3 border-b border-gray-800 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg
                className="h-4 w-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold">Tokamak Pilot</h1>
              <p className="text-[11px] text-gray-500">
                Next.js Chat Integration Example
              </p>
            </div>
            <div className="ml-auto">
              <a
                href="https://github.com/tokamak-network/tokamak-network-pilot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 transition-colors hover:text-gray-300"
              >
                GitHub
              </a>
            </div>
          </header>

          {/* Main content */}
          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
