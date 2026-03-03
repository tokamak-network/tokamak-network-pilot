'use client';

import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import {
  MessageSquare,
  Database,
  FileText,
  Settings,
  TreePine,
  Github,
  Globe,
  Upload,
  BookOpen,
  LogIn,
  LogOut,
  User,
  LayoutDashboard,
  Search,
  X,
  ChevronRight,
  GitFork,
  Star,
  Plus,
  Trash2,
  History,
  FolderKanban,
  Code2,
  Newspaper,
  BarChart3,
  Users,
  Sparkles,
  Map,
} from 'lucide-react';
import {
  sourcesAtom,
  userAtom,
  conversationsListAtom,
  activeConversationIdAtom,
  conversationAtom,
  queryAtom,
  activeProjectAtom,
} from '@/store';
import { dbMessageToLocal } from '@/store/ask';
import {
  fetchSources,
  fetchConversations,
  fetchConversation,
  deleteConversation,
  type SourceResponse,
} from '@/lib/api';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ProjectSwitcher } from '@/components/project-switcher';

const globalNav = [
  { label: 'Ask', href: '/', icon: MessageSquare },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'News', href: '/news', icon: Newspaper },
  { label: 'Social Posts', href: '/social-posts', icon: Sparkles },
  { label: 'Content', href: '/content', icon: FileText },
];

const sourceTypeIcons: Record<string, React.ElementType> = {
  github_repo: Github,
  github_org: Github,
  documentation: Globe,
  file_upload: Upload,
  website: Globe,
  notion: BookOpen,
  custom: Database,
};

const statusDots: Record<string, string> = {
  active: 'bg-success',
  syncing: 'bg-warning animate-pulse',
  error: 'bg-destructive',
  disabled: 'bg-muted-foreground/50',
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sources, setSources] = useAtom(sourcesAtom);
  const [user, setUser] = useAtom(userAtom);
  const [activeProject] = useAtom(activeProjectAtom);
  const [repoPopoverOpen, setRepoPopoverOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [conversationsList, setConversationsList] = useAtom(conversationsListAtom);
  const [activeConversationId, setActiveConversationId] = useAtom(activeConversationIdAtom);
  const [, setConversation] = useAtom(conversationAtom);
  const [, setQuery] = useAtom(queryAtom);

  useEffect(() => {
    fetchSources()
      .then((data) => setSources(data.sources))
      .catch(() => {});
  }, [setSources]);

  useEffect(() => {
    fetchConversations()
      .then((res) => setConversationsList(res.data))
      .catch(() => {});
  }, [setConversationsList]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('tokamak_token');
    setUser(null);
    setUserMenuOpen(false);
    router.push('/');
  }, [setUser, router]);

  const openUserMenu = useCallback(() => {
    if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
    setUserMenuOpen(true);
  }, []);

  const closeUserMenu = useCallback(() => {
    userMenuTimeoutRef.current = setTimeout(() => setUserMenuOpen(false), 200);
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setConversation([]);
    setQuery('');
    router.push('/');
  }, [setActiveConversationId, setConversation, setQuery, router]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      try {
        const detail = await fetchConversation(id);
        setActiveConversationId(id);
        setConversation(detail.messages.map(dbMessageToLocal));
        setQuery('');
        router.push('/');
      } catch {
        router.push('/');
      }
    },
    [setActiveConversationId, setConversation, setQuery, router],
  );

  const handleDeleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await deleteConversation(id);
        setConversationsList((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setConversation([]);
        }
      } catch {
        // Silently fail
      }
    },
    [activeConversationId, setActiveConversationId, setConversation, setConversationsList],
  );

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const sortedSources = useMemo(() => {
    let filtered = [...sources];

    if (repoSearch.trim()) {
      const q = repoSearch.toLowerCase();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
      const aPushed = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
      const bPushed = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
      if (aPushed !== bPushed) return bPushed - aPushed;
      if (b.documentCount !== a.documentCount) return b.documentCount - a.documentCount;
      return 0;
    });

    return filtered;
  }, [sources, repoSearch]);

  useEffect(() => {
    if (repoPopoverOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setRepoSearch('');
    }
  }, [repoPopoverOpen]);

  const projectNav = activeProject
    ? [
        { label: 'Overview', href: `/projects/${activeProject.slug}`, icon: BarChart3 },
        { label: 'News', href: '/news', icon: Newspaper },
        { label: 'Social Posts', href: '/social-posts', icon: Sparkles },
        { label: 'Ask', href: '/', icon: MessageSquare },
        { label: 'Roadmap', href: `/projects/${activeProject.slug}/roadmap`, icon: Map },
      ]
    : [];

  const projectManageNav = activeProject
    ? [
        { label: 'Sources', href: `/projects/${activeProject.slug}#sources`, icon: Database },
        { label: 'Team', href: `/projects/${activeProject.slug}#team`, icon: Users },
        { label: 'Settings', href: `/projects/${activeProject.slug}#settings`, icon: Settings },
      ]
    : [];

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* Header — Project Switcher */}
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <ProjectSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {activeProject ? (
          <>
            {/* Project-scoped navigation */}
            <SidebarGroup>
              <SidebarGroupLabel>Project</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projectNav.map((item) => (
                    <SidebarMenuItem key={item.label}>
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

            <SidebarGroup>
              <SidebarGroupLabel>Manage</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projectManageNav.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
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

            {/* Global quick links */}
            <SidebarGroup>
              <SidebarGroupLabel>Global</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/dashboard')}
                      tooltip="Dashboard"
                    >
                      <Link href="/dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/projects')}
                      tooltip="All Projects"
                    >
                      <Link href="/projects">
                        <FolderKanban />
                        <span>All Projects</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/content')}
                      tooltip="Content"
                    >
                      <Link href="/content">
                        <FileText />
                        <span>Content</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Sources flyout */}
                  <SidebarMenuItem>
                    <Popover open={repoPopoverOpen} onOpenChange={setRepoPopoverOpen}>
                      <PopoverTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive('/sources')}
                          tooltip="Sources"
                          className="w-full"
                        >
                          <Database />
                          <span className="flex-1">Sources</span>
                          {sources.length > 0 && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {sources.length}
                            </span>
                          )}
                          <ChevronRight className={`size-3 text-muted-foreground transition-transform ${repoPopoverOpen ? 'rotate-90' : ''}`} />
                        </SidebarMenuButton>
                      </PopoverTrigger>
                      <PopoverContent
                        side="right"
                        align="start"
                        sideOffset={8}
                        className="w-80 p-0"
                      >
                        <RepoFlyout
                          sources={sortedSources}
                          allCount={sources.length}
                          search={repoSearch}
                          onSearchChange={setRepoSearch}
                          searchRef={searchInputRef}
                          pathname={pathname}
                          onSelect={() => setRepoPopoverOpen(false)}
                        />
                      </PopoverContent>
                    </Popover>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <>
            {/* Global navigation (no project selected) */}
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {globalNav.map((item) => (
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

                  {/* Sources — with repo flyout */}
                  <SidebarMenuItem>
                    <Popover open={repoPopoverOpen} onOpenChange={setRepoPopoverOpen}>
                      <PopoverTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive('/sources')}
                          tooltip="Sources"
                          className="w-full"
                        >
                          <Database />
                          <span className="flex-1">Sources</span>
                          {sources.length > 0 && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {sources.length}
                            </span>
                          )}
                          <ChevronRight className={`size-3 text-muted-foreground transition-transform ${repoPopoverOpen ? 'rotate-90' : ''}`} />
                        </SidebarMenuButton>
                      </PopoverTrigger>

                      <PopoverContent
                        side="right"
                        align="start"
                        sideOffset={8}
                        className="w-80 p-0"
                      >
                        <RepoFlyout
                          sources={sortedSources}
                          allCount={sources.length}
                          search={repoSearch}
                          onSearchChange={setRepoSearch}
                          searchRef={searchInputRef}
                          pathname={pathname}
                          onSelect={() => setRepoPopoverOpen(false)}
                        />
                      </PopoverContent>
                    </Popover>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Conversation History */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <History className="size-3" />
              Recent Chats
            </span>
            <button
              onClick={handleNewChat}
              className="p-0.5 rounded hover:bg-muted transition-colors"
              title="New Chat"
            >
              <Plus className="size-3 text-muted-foreground" />
            </button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversationsList.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
                  No conversations yet
                </div>
              ) : (
                conversationsList.slice(0, 10).map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton
                      isActive={activeConversationId === conv.id}
                      tooltip={conv.title}
                      onClick={() => handleSelectConversation(conv.id)}
                      className="group/conv w-full"
                    >
                      <MessageSquare className="size-4 shrink-0" />
                      <span className="flex-1 truncate text-xs">{conv.title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                      title="Delete conversation"
                      showOnHover
                    >
                      <Trash2 className="size-3" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* Footer — Auth */}
      <SidebarFooter>
        <SidebarMenu>
          {user ? (
            <SidebarMenuItem
              onMouseEnter={openUserMenu}
              onMouseLeave={closeUserMenu}
            >
              <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <PopoverTrigger asChild>
                  <SidebarMenuButton size="sm" tooltip={user.email} className="w-full">
                    <User className="size-4" />
                    <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
                      <span className="text-xs font-medium truncate">{user.name || user.email}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{user.role}</span>
                    </div>
                    <ChevronRight className={`ml-auto size-3 text-muted-foreground transition-transform group-data-[collapsible=icon]:hidden ${userMenuOpen ? 'rotate-90' : ''}`} />
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  align="end"
                  sideOffset={8}
                  className="w-48 p-1"
                  onMouseEnter={openUserMenu}
                  onMouseLeave={closeUserMenu}
                >
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <Settings className="size-4 text-muted-foreground" />
                    <span>Settings</span>
                  </Link>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="size-4" />
                    <span>Sign Out</span>
                  </button>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
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

// ─── Repo Flyout Panel ──────────────────────────────────────

function RepoFlyout({
  sources,
  allCount,
  search,
  onSearchChange,
  searchRef,
  pathname,
  onSelect,
}: {
  sources: SourceResponse[];
  allCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  pathname: string;
  onSelect: () => void;
}) {
  return (
    <div className="flex flex-col max-h-[70vh]">
      {/* Header with search */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Repositories</h3>
          <Link
            href="/sources"
            onClick={onSelect}
            className="text-xs text-primary hover:underline"
          >
            View all {allCount}
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search repositories..."
            className="w-full h-8 pl-8 pr-8 text-sm rounded-md border bg-muted/50 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {search && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {sources.length} of {allCount} repositories
          </p>
        )}
      </div>

      {/* Repo list */}
      <div className="overflow-y-auto flex-1">
        {sources.length === 0 ? (
          <div className="p-6 text-center">
            <Database className="size-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {search ? `No repos match "${search}"` : 'No repositories indexed yet'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {sources.map((source) => {
              const Icon = sourceTypeIcons[source.type] || Database;
              const href = `/sources/${source.id}`;
              const active = pathname === href;
              const repoName = source.name.includes('/')
                ? source.name.split('/')[1]
                : source.name;
              const orgName = source.name.includes('/')
                ? source.name.split('/')[0]
                : null;

              return (
                <Link
                  key={source.id}
                  href={href}
                  onClick={onSelect}
                  className={`flex items-start gap-3 px-3 py-2 hover:bg-muted/80 transition-colors ${
                    active ? 'bg-muted' : ''
                  }`}
                >
                  <div className="relative mt-0.5 shrink-0">
                    <Icon className="size-4 text-muted-foreground" />
                    <div
                      className={`absolute -top-0.5 -right-0.5 size-1.5 rounded-full ${statusDots[source.status] || 'bg-muted-foreground/50'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{repoName}</span>
                      {source.language && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {source.language}
                        </span>
                      )}
                    </div>
                    {orgName && (
                      <p className="text-[11px] text-muted-foreground">{orgName}</p>
                    )}
                    {source.description && (
                      <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                        {source.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      {(source.stars ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="size-2.5" />
                          {source.stars}
                        </span>
                      )}
                      {source.documentCount > 0 && (
                        <span>{source.documentCount} chunks</span>
                      )}
                      {source.pushedAt && (
                        <span>{timeAgo(source.pushedAt)}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground mt-1 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
