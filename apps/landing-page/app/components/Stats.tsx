"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  GitBranch,
  MessageCircle,
  FileText,
  Database,
  FolderOpen,
} from "lucide-react";
import AnimateOnScroll, { StaggerContainer, StaggerItem } from "./AnimateOnScroll";

function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return { count, ref };
}

const stats = [
  { label: "Repos Ingested", value: 50, suffix: "+", icon: Activity, color: "#10B981" },
  { label: "Files Indexed", value: 15, suffix: "K+", icon: BarChart3, color: "#06B6D4" },
  { label: "Questions Answered", value: 10, suffix: "K+", icon: TrendingUp, color: "#8B5CF6" },
  { label: "Active Users", value: 500, suffix: "+", icon: Users, color: "#F59E0B" },
];

function StatCard({ stat }: { stat: (typeof stats)[number] }) {
  const { count, ref } = useCounter(stat.value);

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg lg:p-8"
      style={
        { "--stat-color": stat.color } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${stat.color}18 0%, transparent 70%)`,
        }}
      />

      <div
        className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-md"
        style={{ background: `${stat.color}14` }}
      >
        <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
      </div>

      <p className="relative text-3xl font-bold tracking-tight text-text-heading lg:text-4xl">
        {count}
        {stat.suffix}
      </p>
      <p className="relative mt-1.5 text-sm font-medium text-text-muted">
        {stat.label}
      </p>

      <div
        className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full transition-all duration-500 group-hover:w-14"
        style={{ background: `linear-gradient(90deg, transparent, ${stat.color}, transparent)` }}
      />
    </div>
  );
}

const sidebarNav = [
  { name: "Ask", icon: MessageCircle, active: false },
  { name: "Dashboard", icon: BarChart3, active: true },
  { name: "Projects", icon: FolderOpen, active: false },
  { name: "Content", icon: FileText, active: false },
  { name: "Sources", icon: Database, badge: "370", active: false },
];

const metricCards = [
  { label: "Repositories", value: "370", sub: "126 indexed", icon: GitBranch },
  { label: "Documents Fetched", value: "3,503", sub: "From GitHub", icon: FileText },
  { label: "Vector Chunks", value: "35,307", sub: "In Qdrant", icon: Database },
  { label: "Team Content", value: "0", sub: "Curated entries", icon: Users },
];

const statusPills = [
  { label: "Fetched", value: "126", dot: "bg-emerald", bg: "bg-emerald/15", text: "text-emerald" },
  { label: "Syncing", value: "0", dot: "bg-yellow-500", bg: "bg-yellow-500/10", text: "text-yellow-500" },
  { label: "Failed", value: "0", dot: "bg-red-400", bg: "bg-red-400/10", text: "text-red-400" },
  { label: "Empty", value: "244", dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-500" },
  { label: "Pending", value: "0", dot: "bg-slate-400", bg: "bg-slate-400/10", text: "text-slate-400" },
];

const contentBreakdown = [
  { type: "Docs / Markdown", count: "34,258", pct: 97 },
  { type: "READMEs", count: "1,049", pct: 3 },
];

const topRepos = [
  { name: "tokamak-network/ton-staking-v2", chunks: "9,204" },
  { name: "tokamak-network/docs.tokamak.net", chunks: "4,622" },
  { name: "tokamak-network/titan-contracts", chunks: "3,891" },
];

function DashboardMockup() {
  return (
    <div className="mockup-window-enhanced overflow-hidden rounded-2xl">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-slate-500">Tokamak Forest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
          <span className="text-[10px] font-medium text-emerald/70">Live</span>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-[140px] shrink-0 border-r border-white/8 px-2.5 py-4 sm:block">
          <div className="mb-5 flex items-center gap-2 px-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald/20">
              <span className="text-[9px] font-black text-emerald">TF</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-white">
                Tokamak Forest
              </p>
              <p className="text-[8px] text-slate-600">Knowledge Hub</p>
            </div>
          </div>

          <p className="mb-1 px-1.5 text-[8px] uppercase tracking-widest text-slate-600">
            Navigation
          </p>
          <div className="mb-4 space-y-0.5">
            {sidebarNav.map((item) => (
              <div
                key={item.name}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] ${
                  item.active
                    ? "bg-emerald/10 font-semibold text-emerald"
                    : "text-slate-500"
                }`}
              >
                <item.icon className="h-3 w-3 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="text-[9px] tabular-nums text-slate-600">
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-white/8 pt-3">
            <p className="mb-1.5 px-1.5 text-[8px] uppercase tracking-widest text-slate-600">
              Recent Chats
            </p>
            <div className="space-y-1 px-1.5">
              <p className="truncate text-[10px] text-slate-500">
                How does TON work?
              </p>
              <p className="truncate text-[10px] text-slate-600">
                Titan L2 overview
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Dashboard</h3>
            <p className="text-[10px] text-slate-500">
              Analytics and overview of the Tokamak knowledge base.
            </p>
          </div>

          {/* Metric cards */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metricCards.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[9px] text-slate-500">{m.label}</p>
                  <m.icon className="h-3 w-3 text-slate-600" />
                </div>
                <p className="text-base font-bold tabular-nums text-white sm:text-lg">
                  {m.value}
                </p>
                <p className="mt-0.5 text-[9px] text-slate-600">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Status pills */}
          <div className="mb-3 grid grid-cols-5 gap-1.5">
            {statusPills.map((s) => (
              <div
                key={s.label}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${s.bg}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                <span
                  className={`text-[10px] font-bold tabular-nums ${s.text}`}
                >
                  {s.value}
                </span>
                <span className={`text-[9px] opacity-60 ${s.text}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom panels */}
          <div className="grid gap-2 sm:grid-cols-2">
            {/* Content Breakdown */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3.5">
              <div className="mb-0.5 flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3 text-slate-500" />
                <p className="text-[10px] font-semibold text-white">
                  Content Breakdown
                </p>
              </div>
              <p className="mb-3 text-[9px] text-slate-600">
                Indexed chunks by content type
              </p>
              <div className="space-y-2.5">
                {contentBreakdown.map((item) => (
                  <div key={item.type}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-2.5 w-2.5 text-slate-600" />
                        <span className="text-[10px] text-slate-400">
                          {item.type}
                        </span>
                      </div>
                      <span className="text-[10px] tabular-nums text-slate-500">
                        {item.count}{" "}
                        <span className="text-slate-600">({item.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-emerald/50"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Repositories */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3.5">
              <div className="mb-0.5 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-slate-500" />
                <p className="text-[10px] font-semibold text-white">
                  Top Repositories
                </p>
              </div>
              <p className="mb-3 text-[9px] text-slate-600">
                Largest repos by indexed chunk count
              </p>
              <div className="space-y-2">
                {topRepos.map((repo, i) => (
                  <div key={repo.name} className="flex items-center gap-2">
                    <span className="w-3 text-right text-[9px] font-semibold text-slate-600">
                      {i + 1}.
                    </span>
                    <GitBranch className="h-3 w-3 shrink-0 text-emerald/40" />
                    <p className="min-w-0 flex-1 truncate text-[10px] text-slate-400">
                      {repo.name}
                    </p>
                    <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
                      {repo.chunks}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Stats() {
  return (
    <section className="relative overflow-hidden bg-surface-secondary py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-radial-emerald-center" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.04)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.03)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <AnimateOnScroll className="mx-auto mb-6 max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald/20 bg-emerald-bg px-4 py-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-dark" />
            <span className="text-xs font-semibold text-emerald-dark">
              Platform Metrics
            </span>
          </div>
          <h2 className="mb-5 text-3xl font-bold tracking-tight text-text-heading md:text-4xl lg:text-5xl">
            Effortless knowledge,{" "}
            <span className="text-gradient-emerald">powerful answers,</span> and
            grounded citations.
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-text-secondary md:text-lg">
            Trusted by teams across the Tokamak ecosystem to find answers faster
            and build with confidence.
          </p>
        </AnimateOnScroll>

        <StaggerContainer
          className="mb-16 mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
          staggerDelay={0.1}
        >
          {stats.map((stat) => (
            <StaggerItem key={stat.label} variant="scale-up">
              <StatCard stat={stat} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        <AnimateOnScroll className="mx-auto max-w-4xl" delay={0.2}>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-b from-emerald/[0.04] via-transparent to-transparent blur-xl" />
            <DashboardMockup />
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
