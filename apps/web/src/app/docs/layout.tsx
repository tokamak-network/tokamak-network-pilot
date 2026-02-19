'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ExternalLink,
  BookOpen,
  Code2,
  Compass,
  Bell,
} from 'lucide-react';
import { CopyPageDropdown } from '@/components/docs/shared';

const NAV_ITEMS = [
  { href: '/docs', label: 'Getting Started', icon: BookOpen },
  { href: '/docs/api-reference', label: 'API Reference', icon: Code2 },
  { href: '/docs/guides', label: 'Guides', icon: Compass },
  { href: '/docs/updates', label: 'Updates', icon: Bell },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/docs') return pathname === '/docs';
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Horizontal Tab Navigation */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <nav className="flex items-center gap-1 overflow-x-auto -mb-px">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-primary text-primary font-medium'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0 pl-4">
            <CopyPageDropdown />
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3" />
              Swagger
            </a>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <main className="flex-1 w-full px-6 py-10">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>

        <footer className="max-w-5xl mx-auto mt-16 border-t border-border pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>Tokamak Forest API v0.4.0</span>
          <div className="flex items-center gap-4">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3" />
              Swagger UI
            </a>
            <Link href="/settings" className="hover:text-foreground transition-colors">
              Manage API Keys
            </Link>
            <Link href="/docs/updates" className="hover:text-foreground transition-colors">
              Changelog
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
