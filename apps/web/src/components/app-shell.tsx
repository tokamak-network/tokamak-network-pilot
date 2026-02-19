'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import Link from 'next/link';
import { BookOpen, Loader2, LogIn } from 'lucide-react';
import { userAtom } from '@/store';
import { fetchMe } from '@/lib/api';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

/** Public routes that don't require authentication */
const PUBLIC_PATHS = ['/login', '/docs'];

function isProtectedPath(pathname: string): boolean {
  return !PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useAtom(userAtom);
  const [authChecking, setAuthChecking] = useState(true);

  const protectedPath = useMemo(
    () => (pathname ? isProtectedPath(pathname) : false),
    [pathname],
  );

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('tokamak_token');

    if (!token) {
      if (!cancelled) {
        setUser(null);
        setAuthChecking(false);
      }
      return () => {
        cancelled = true;
      };
    }

    if (user) {
      setAuthChecking(false);
      return () => {
        cancelled = true;
      };
    }

    fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        localStorage.removeItem('tokamak_token');
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setUser, user]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('tokamak:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('tokamak:unauthorized', handleUnauthorized);
    };
  }, [setUser]);

  useEffect(() => {
    if (!pathname || authChecking) return;
    if (!protectedPath || user) return;
    const next = encodeURIComponent(pathname);
    router.replace(`/login?next=${next}`);
  }, [authChecking, pathname, protectedPath, router, user]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (protectedPath && authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (protectedPath && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Sign in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in to access this page.
          </p>
          <Button
            className="mt-5 w-full"
            onClick={() => router.push(`/login?next=${encodeURIComponent(pathname || '/')}`)}
          >
            <LogIn className="size-4" />
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-5" />
          <span className="text-sm font-serif text-muted-foreground">
            Tokamak Forest
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Link href="/docs">
                <BookOpen className="size-3.5" />
                <span className="text-xs">API Docs</span>
              </Link>
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
