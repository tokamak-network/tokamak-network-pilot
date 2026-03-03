'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import {
  ChevronsUpDown,
  Check,
  FolderKanban,
  Search,
  X,
  Layers,
} from 'lucide-react';
import {
  projectsAtom,
  activeProjectAtom,
  userAtom,
} from '@/store';
import type { ActiveProject } from '@/store';
import { fetchProjects, fetchMyProjectRole } from '@/lib/api';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

export function ProjectSwitcher() {
  const [projects, setProjects] = useAtom(projectsAtom);
  const [activeProject, setActiveProject] = useAtom(activeProjectAtom);
  const [user] = useAtom(userAtom);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [myProjectIds, setMyProjectIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects(data.projects))
      .catch(() => {});
  }, [setProjects]);

  useEffect(() => {
    if (!user || projects.length === 0) return;
    let cancelled = false;

    async function loadRoles() {
      const ids = new Set<string>();
      await Promise.allSettled(
        projects.map(async (p) => {
          try {
            const { role } = await fetchMyProjectRole(p.id);
            if (role) ids.add(p.id);
          } catch { /* not a member */ }
        }),
      );
      if (!cancelled) setMyProjectIds(ids);
    }

    loadRoles();
    return () => { cancelled = true; };
  }, [user, projects]);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearch('');
    }
  }, [open]);

  const handleSelect = useCallback(
    (project: ActiveProject | null) => {
      setActiveProject(project);
      setOpen(false);
    },
    [setActiveProject],
  );

  const { myProjects, otherProjects } = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q),
        )
      : projects;

    const mine: typeof projects = [];
    const others: typeof projects = [];
    for (const p of filtered) {
      if (myProjectIds.has(p.id)) mine.push(p);
      else others.push(p);
    }
    return { myProjects: mine, otherProjects: others };
  }, [projects, search, myProjectIds]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full group-data-[collapsible=icon]:justify-center"
            >
              {activeProject ? (
                <>
                  {activeProject.logoUrl ? (
                    <img
                      src={activeProject.logoUrl}
                      alt=""
                      className="size-8 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <FolderKanban className="size-4 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden min-w-0">
                    <span className="font-medium text-sm truncate">
                      {activeProject.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      /{activeProject.slug}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-foreground">
                    <Layers className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="font-serif font-semibold">Tokamak Forest</span>
                    <span className="text-[11px] text-muted-foreground">
                      All Projects
                    </span>
                  </div>
                </>
              )}
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </PopoverTrigger>

          <PopoverContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-72 p-0"
          >
            <div className="flex flex-col max-h-[70vh]">
              {/* Search */}
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full h-8 pl-8 pr-8 text-sm rounded-md border bg-muted/50 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {/* All Projects option */}
                <button
                  onClick={() => handleSelect(null)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted/80 transition-colors ${
                    !activeProject ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                    <Layers className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">All Projects</p>
                    <p className="text-[11px] text-muted-foreground">
                      Global view
                    </p>
                  </div>
                  {!activeProject && (
                    <Check className="size-4 text-primary shrink-0" />
                  )}
                </button>

                {/* My Projects */}
                {myProjects.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider border-t">
                      My Projects
                    </div>
                    {myProjects.map((p) => (
                      <ProjectOption
                        key={p.id}
                        project={p}
                        isActive={activeProject?.id === p.id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </>
                )}

                {/* Other Projects */}
                {otherProjects.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider border-t">
                      Other Projects
                    </div>
                    {otherProjects.map((p) => (
                      <ProjectOption
                        key={p.id}
                        project={p}
                        isActive={activeProject?.id === p.id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </>
                )}

                {myProjects.length === 0 && otherProjects.length === 0 && search && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No projects match &ldquo;{search}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function ProjectOption({
  project,
  isActive,
  onSelect,
}: {
  project: { id: string; slug: string; name: string; logoUrl?: string; isNewsEnabled: boolean };
  isActive: boolean;
  onSelect: (p: ActiveProject) => void;
}) {
  return (
    <button
      onClick={() =>
        onSelect({
          id: project.id,
          slug: project.slug,
          name: project.name,
          logoUrl: project.logoUrl,
          isNewsEnabled: project.isNewsEnabled,
        })
      }
      className={`flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/80 transition-colors ${
        isActive ? 'bg-muted' : ''
      }`}
    >
      {project.logoUrl ? (
        <img
          src={project.logoUrl}
          alt=""
          className="size-7 rounded-md object-cover shrink-0"
        />
      ) : (
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
          <FolderKanban className="size-3.5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          /{project.slug}
        </p>
      </div>
      {isActive && <Check className="size-4 text-primary shrink-0" />}
    </button>
  );
}
