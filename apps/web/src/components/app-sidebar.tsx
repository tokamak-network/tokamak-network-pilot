'use client';

import { useEffect, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAtom, useSetAtom } from 'jotai';
import {
  MessageSquare,
  Database,
  FileText,
  Settings,
  Zap,
  ExternalLink,
  Github,
  Globe,
  Upload,
  BookOpen,
  LogIn,
  LogOut,
  User,
  LayoutDashboard,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { sourcesAtom, userAtom } from '@/store';
import { fetchSources, fetchMe } from '@/lib/api';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const mainNav = [
  { label: 'Ask', href: '/', icon: MessageSquare },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Sources', href: '/sources', icon: Database },
  { label: 'Content', href: '/content', icon: FileText },
];

const secondaryNav = [
  { label: 'Settings', href: '/settings', icon: Settings },
  {
    label: 'API Docs',
    href: 'http://localhost:4000/docs',
    icon: ExternalLink,
    external: true,
  },
];

const sourceTypeIcons: Record<string, React.ElementType> = {
  github_repo: Github,
  github_org: Github,
  documentation: Globe,
  file_upload: Upload,
  notion: BookOpen,
  custom: Database,
};

const statusDots: Record<string, string> = {
  active: 'bg-green-500',
  syncing: 'bg-yellow-500 animate-pulse',
  error: 'bg-red-500',
  disabled: 'bg-gray-400',
};

/** Max repos to show in the sidebar before a "View all" link */
const MAX_SIDEBAR_REPOS = 20;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sources, setSources] = useAtom(sourcesAtom);
  const [user, setUser] = useAtom(userAtom);
  const [repoSearch, setRepoSearch] = useState('');

  useEffect(() => {
    // Load sources for sidebar on mount
    fetchSources()
      .then((data) => setSources(data.sources))
      .catch(() => {
        // API might not be running
      });
  }, [setSources]);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('tokamak_token');
    if (token && !user) {
      fetchMe()
        .then((u) => setUser(u))
        .catch(() => {
          // Token invalid — clear it
          localStorage.removeItem('tokamak_token');
        });
    }
  }, [user, setUser]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('tokamak_token');
    setUser(null);
    router.push('/');
  }, [setUser, router]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  /**
   * Sort repos: currently-viewed repo always at top, then by latest GitHub
   * commit (pushedAt), then by most documents. Filter by search query.
   * Limit to MAX_SIDEBAR_REPOS.
   */
  const sortedSources = useMemo(() => {
    const activeSourceId = pathname.startsWith('/sources/')
      ? pathname.split('/')[2]
      : null;

    let filtered = [...sources];

    // Apply search filter
    if (repoSearch.trim()) {
      const q = repoSearch.toLowerCase();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
      // Active repo always goes first
      if (a.id === activeSourceId) return -1;
      if (b.id === activeSourceId) return 1;

      // Primary: latest GitHub commit (pushedAt) first
      const aPushed = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
      const bPushed = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
      if (aPushed !== bPushed) return bPushed - aPushed;

      // Secondary: most documents first
      if (b.documentCount !== a.documentCount) return b.documentCount - a.documentCount;

      // Tertiary: last synced
      const aSync = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0;
      const bSync = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0;
      return bSync - aSync;
    });

    return filtered.slice(0, MAX_SIDEBAR_REPOS);
  }, [sources, pathname, repoSearch]);

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* Header / Logo — h-14 matches the main content header */}
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Zap className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Tokamak Network Pilot</span>
                  <span className="text-xs text-muted-foreground">Knowledge Hub</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dynamic Repositories — sorted by activity, active repo promoted to top */}
        {sources.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              Repositories
              <span className="ml-auto text-[10px] text-muted-foreground font-normal">
                {sources.length}
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {/* Quick search */}
              {sources.length > 5 && (
                <div className="px-2 pb-1.5">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
                    <input
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder="Search repos..."
                      className="w-full h-7 pl-7 pr-7 text-xs rounded-md border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
                    />
                    {repoSearch && (
                      <button
                        onClick={() => setRepoSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-sidebar-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              <SidebarMenu>
                {sortedSources.map((source) => {
                  const Icon = sourceTypeIcons[source.type] || Database;
                  const href = `/sources/${source.id}`;
                  const active = pathname === href;
                  return (
                    <SidebarMenuItem key={source.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={source.name}
                      >
                        <Link href={href}>
                          <div className="relative">
                            <Icon className="size-4" />
                            <div
                              className={`absolute -top-0.5 -right-0.5 size-1.5 rounded-full ${statusDots[source.status] || 'bg-gray-400'}`}
                            />
                          </div>
                          <span className="truncate">{source.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {repoSearch && sortedSources.length === 0 && (
                  <SidebarMenuItem>
                    <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                      No repos match &ldquo;{repoSearch}&rdquo;
                    </div>
                  </SidebarMenuItem>
                )}
                {(sources.length > MAX_SIDEBAR_REPOS || repoSearch) && sortedSources.length > 0 && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="View all repositories">
                      <Link href="/sources" className="text-muted-foreground">
                        <ChevronRight className="size-4" />
                        <span className="text-xs">
                          {repoSearch
                            ? `${sortedSources.length} of ${sources.length} repos`
                            : `View all ${sources.length} repos`}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={!('external' in item) && isActive(item.href)}
                    tooltip={item.label}
                  >
                    {'external' in item ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
                    ) : (
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — Auth */}
      <SidebarFooter>
        <SidebarMenu>
          {user ? (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton size="sm" className="cursor-default" tooltip={user.email}>
                  <User className="size-4" />
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-medium truncate">{user.name || user.email}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{user.role}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton size="sm" tooltip="Sign out" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="sm" tooltip="Sign in">
                <Link href="/login">
                  <LogIn className="size-4" />
                  <span>Sign In</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
