import {
  FileCode2,
  GitBranch,
  Search,
  Code2,
  Layers,
  ArrowRight,
  Quote,
  Database,
} from "lucide-react";
import AnimateOnScroll from "./AnimateOnScroll";

const APP_URL = "https://app.tokamakforest.com/";

const features = [
  {
    badge: "AI-Powered Q&A",
    title: "Ask in plain language, get expert answers",
    description:
      "Type any question about the Tokamak ecosystem in natural language. The Forest searches across every ingested repository, document, and code file to synthesize a comprehensive answer with clickable citations to original sources.",
    mockup: "chat",
  },
  {
    badge: "Smart Code Search",
    title: "Deep contract-level understanding",
    description:
      "Go beyond keyword search. The Forest semantically understands Solidity contracts, TypeScript modules, and configuration files. Find function implementations, trace dependencies, and understand architecture, all from a single query.",
    mockup: "code",
  },
  {
    badge: "Project Management",
    title: "Organize knowledge by project scope",
    description:
      "Create dedicated project spaces (Clearings) that scope your questions to specific repositories. Perfect for teams working on Titan, staking systems, or bridge contracts, each with their own curated knowledge base.",
    mockup: "projects",
  },
  {
    badge: "Developer SDK & API",
    title: "Build on top of the Forest",
    description:
      "Full REST API and TypeScript SDK to integrate Tokamak knowledge into your own tools. Embed answers in Discord bots, CI pipelines, documentation sites, or any developer workflow.",
    mockup: "api",
  },
];

function ChatMockup() {
  return (
    <div className="mockup-window overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3.5">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-500">Tokamak Forest</span>
      </div>
      <div className="space-y-4 p-6">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-emerald/20 px-4 py-3">
          <p className="text-sm text-emerald-light">
            How does TON staking delegation work?
          </p>
        </div>
        <div className="max-w-[88%] space-y-3 rounded-2xl rounded-bl-md bg-white/8 px-4 py-3">
          <p className="text-sm leading-relaxed text-slate-300">
            TON staking delegation allows token holders to delegate their TON to
            Layer 2 operators without transferring ownership...
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <Quote className="h-3 w-3 text-emerald" />
            <span className="text-xs text-emerald">
              StakingManager.sol:L142
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeMockup() {
  return (
    <div className="mockup-window overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3.5">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-500">Code Search</span>
      </div>
      <div className="p-6">
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-white/8 px-4 py-3">
          <Search className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-400">
            staking deposit function
          </span>
        </div>
        <div className="space-y-2">
          {[
            { file: "StakingManager.sol", line: "function deposit(uint256 amount)", lang: "Solidity" },
            { file: "L2Staking.ts", line: "async function processDeposit(tx)", lang: "TypeScript" },
            { file: "staking.test.ts", line: "describe('deposit flow', () =>", lang: "Test" },
          ].map((r) => (
            <div
              key={r.file}
              className="flex items-center gap-3 rounded-xl bg-white/5 p-3.5 transition-colors hover:bg-white/8"
            >
              <FileCode2 className="h-4 w-4 shrink-0 text-emerald" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-200">{r.file}</p>
                <p className="truncate font-mono text-xs text-slate-500">{r.line}</p>
              </div>
              <span className="shrink-0 rounded-md bg-emerald/15 px-2 py-0.5 text-xs text-emerald">
                {r.lang}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectsMockup() {
  return (
    <div className="mockup-window overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3.5">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-500">Projects</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-6">
        {[
          { name: "Titan L2", repos: 12, icon: Layers, active: true },
          { name: "TON Staking", repos: 8, icon: Database },
          { name: "Bridge", repos: 5, icon: GitBranch },
          { name: "Contracts V2", repos: 15, icon: Code2 },
        ].map((p) => (
          <div
            key={p.name}
            className={`rounded-xl border p-4 transition-colors ${
              p.active
                ? "border-emerald/40 bg-emerald/10"
                : "border-white/8 bg-white/5 hover:border-white/15"
            }`}
          >
            <p.icon className={`mb-2 h-5 w-5 ${p.active ? "text-emerald" : "text-slate-500"}`} />
            <p className="text-sm font-medium text-slate-200">{p.name}</p>
            <p className="text-xs text-slate-500">{p.repos} repos</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiMockup() {
  return (
    <div className="mockup-window overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3.5">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-500">SDK Example</span>
      </div>
      <div className="p-6">
        <pre className="overflow-x-auto text-sm leading-relaxed">
          <code>
            <span className="text-purple-400">import</span>
            <span className="text-slate-300"> {"{ "}</span>
            <span className="text-emerald">TokamakForest</span>
            <span className="text-slate-300">{" }"} </span>
            <span className="text-purple-400">from</span>
            <span className="text-amber-300"> &apos;@tokamak-pilot/sdk&apos;</span>
            <br /><br />
            <span className="text-purple-400">const</span>
            <span className="text-sky-300"> forest</span>
            <span className="text-slate-400"> = </span>
            <span className="text-purple-400">new</span>
            <span className="text-emerald"> TokamakForest</span>
            <span className="text-slate-400">({"{"}</span>
            <br />
            <span className="text-slate-400">{"  "}</span>
            <span className="text-sky-300">apiKey</span>
            <span className="text-slate-400">: </span>
            <span className="text-amber-300">&apos;tk_...&apos;</span>
            <br />
            <span className="text-slate-400">{"}"})</span>
            <br /><br />
            <span className="text-purple-400">const</span>
            <span className="text-sky-300"> answer</span>
            <span className="text-slate-400"> = </span>
            <span className="text-purple-400">await</span>
            <span className="text-sky-300"> forest</span>
            <span className="text-slate-400">.</span>
            <span className="text-emerald">ask</span>
            <span className="text-slate-400">(</span>
            <br />
            <span className="text-amber-300">{"  "}&apos;How does the bridge work?&apos;</span>
            <br />
            <span className="text-slate-400">)</span>
          </code>
        </pre>
      </div>
    </div>
  );
}

const mockupMap: Record<string, () => React.JSX.Element> = {
  chat: ChatMockup,
  code: CodeMockup,
  projects: ProjectsMockup,
  api: ApiMockup,
};

export default function Features() {
  return (
    <section id="features" className="relative bg-surface-secondary py-24 md:py-32">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <AnimateOnScroll className="mx-auto mb-20 max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-text-heading md:text-4xl lg:text-5xl">
            Features
          </h2>
          <p className="text-base leading-relaxed text-text-secondary md:text-lg">
            Discover how the Forest makes Tokamak ecosystem knowledge accessible
            to everyone.
          </p>
        </AnimateOnScroll>

        <div className="space-y-28">
          {features.map((feature, i) => {
            const Mockup = mockupMap[feature.mockup];
            const isReversed = i % 2 !== 0;

            return (
              <div
                key={feature.title}
                className={`flex flex-col items-center gap-12 lg:flex-row lg:gap-16 ${
                  isReversed ? "lg:flex-row-reverse" : ""
                }`}
              >
                <AnimateOnScroll
                  className="flex-1 space-y-6"
                  variant={isReversed ? "slide-right" : "slide-left"}
                  duration={0.7}
                >
                  <div className="inline-flex items-center rounded-full border border-emerald/20 bg-emerald-bg px-4 py-1.5">
                    <span className="text-xs font-semibold text-emerald-dark">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold leading-tight text-text-heading md:text-3xl lg:text-4xl">
                    {feature.title}
                  </h3>
                  <p className="max-w-lg text-base leading-relaxed text-text-secondary">
                    {feature.description}
                  </p>
                  <a
                    href={APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-dark transition-colors hover:text-emerald"
                  >
                    Try it now
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </AnimateOnScroll>
                <AnimateOnScroll
                  className="w-full flex-1 lg:max-w-xl"
                  variant={isReversed ? "slide-left" : "slide-right"}
                  duration={0.7}
                  delay={0.15}
                >
                  <Mockup />
                </AnimateOnScroll>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
