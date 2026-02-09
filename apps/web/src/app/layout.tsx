import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tokamak Pilot — Knowledge Hub',
  description:
    'Ask questions, explore documentation, and get reliable answers about the Tokamak Network ecosystem.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 !h-4" />
                <span className="text-sm text-muted-foreground">
                  Tokamak Network Knowledge Hub
                </span>
              </header>
              <div className="flex-1 overflow-auto">
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
