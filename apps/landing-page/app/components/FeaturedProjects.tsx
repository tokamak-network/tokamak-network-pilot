"use client";

import { useEffect, useState } from "react";
import {
  FolderKanban,
  Users,
  Database,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import AnimateOnScroll, { StaggerContainer, StaggerItem } from "./AnimateOnScroll";

interface FeaturedProject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  summary?: string;
  memberCount: number;
  sourceCount: number;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.tokamakforest.com";

export default function FeaturedProjects() {
  const [projects, setProjects] = useState<FeaturedProject[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/projects/featured/landing-page`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || projects.length === 0) return null;

  return (
    <section className="relative bg-surface py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-radial-emerald-top" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <AnimateOnScroll className="mx-auto mb-14 max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald/20 bg-emerald-bg px-4 py-1.5">
            <FolderKanban className="h-3.5 w-3.5 text-emerald-dark" />
            <span className="text-xs font-semibold text-emerald-dark">
              Explore Projects
            </span>
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-text-heading md:text-4xl lg:text-5xl">
            Featured{" "}
            <span className="text-gradient-emerald">Projects</span>
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-text-secondary md:text-lg">
            Browse public knowledge hubs curated by teams across the Tokamak
            ecosystem.
          </p>
        </AnimateOnScroll>

        <StaggerContainer
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.1}
        >
          {projects.map((project) => (
            <StaggerItem key={project.id} variant="scale-up">
              <a
                href={`${APP_URL}/projects/${project.slug}/public`}
                target="_blank"
                rel="noopener noreferrer"
                className="card card-hover group flex flex-col rounded-2xl p-6 transition-all duration-300"
              >
                <div className="mb-4 flex items-center gap-3">
                  {project.logoUrl ? (
                    <img
                      src={project.logoUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-bg">
                      <FolderKanban className="h-5 w-5 text-emerald-dark" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-text-heading group-hover:text-emerald-dark transition-colors">
                      {project.name}
                    </h3>
                    <span className="text-xs text-text-muted">
                      /{project.slug}
                    </span>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </div>

                {project.description && (
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-text-secondary">
                    {project.description}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-4 border-t border-border pt-4">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Database className="h-3.5 w-3.5" />
                    <span>
                      {project.sourceCount} source
                      {project.sourceCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {project.memberCount} member
                      {project.memberCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </a>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <AnimateOnScroll className="mt-12 text-center" delay={0.3}>
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald/20 bg-emerald-bg px-6 py-3 text-sm font-semibold text-emerald-dark transition-all hover:bg-emerald/10 hover:border-emerald/40"
          >
            View All Projects
            <ArrowRight className="h-4 w-4" />
          </a>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
