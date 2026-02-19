import {
  TreePine,
  MessageSquare,
  FileCheck,
  GitBranch,
  Check,
  ArrowDown,
  Quote,
  Search,
} from "lucide-react";

function StepConnector() {
  return (
    <div className="flex items-center justify-center py-6 md:py-8">
      <div className="flex flex-col items-center gap-1">
        <div className="h-8 w-px bg-gradient-to-b from-emerald/40 to-emerald/10" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald/20 bg-emerald-bg">
          <ArrowDown className="h-4 w-4 text-emerald-dark" />
        </div>
        <div className="h-8 w-px bg-gradient-to-b from-emerald/10 to-emerald/40" />
      </div>
    </div>
  );
}

function PlantMockup() {
  return (
    <div className="mockup-window overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-500">Connect Repositories</span>
      </div>
      <div className="space-y-3 p-5">
        {[
          { name: "tokamak-network/contracts-v2", status: "synced", files: "234 files" },
          { name: "tokamak-network/titan", status: "synced", files: "891 files" },
          { name: "tokamak-network/staking", status: "syncing", files: "156 files" },
        ].map((repo) => (
          <div
            key={repo.name}
            className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
          >
            <GitBranch className="h-4 w-4 shrink-0 text-emerald" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">
                {repo.name}
              </p>
              <p className="text-xs text-slate-500">{repo.files}</p>
            </div>
            {repo.status === "synced" ? (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald/15 px-2.5 py-1">
                <Check className="h-3 w-3 text-emerald" />
                <span className="text-xs font-medium text-emerald">Synced</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                <span className="text-xs font-medium text-amber-400">Syncing</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AskMockup() {
  return (
    <div className="mockup-window overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-500">Ask the Forest</span>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/8 px-4 py-3">
          <Search className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-white">
            How does the Titan sequencer work?
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="h-1 w-1 animate-pulse rounded-full bg-emerald" />
            Searching across 50+ repos...
          </div>
          <div className="space-y-1.5 rounded-xl bg-white/5 p-3">
            {["titan/sequencer/batch.go", "docs/architecture.md", "contracts/L2Bridge.sol"].map(
              (file) => (
                <div key={file} className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-emerald/60" />
                  <span className="text-xs text-emerald/80">{file}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerMockup() {
  return (
    <div className="mockup-window overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-500">Sourced Answer</span>
      </div>
      <div className="p-5">
        <p className="mb-3 text-sm leading-relaxed text-slate-300">
          The Titan sequencer processes transactions in batches, compresses them,
          and submits to L1 for data availability...
        </p>
        <div className="space-y-2">
          {[
            { file: "sequencer/batch.go", line: "L47" },
            { file: "architecture.md", line: "§3.2" },
          ].map((cite) => (
            <div
              key={cite.file}
              className="flex items-center gap-2 rounded-lg bg-emerald/8 px-3 py-2"
            >
              <Quote className="h-3 w-3 text-emerald" />
              <span className="text-xs font-medium text-emerald">
                {cite.file}:{cite.line}
              </span>
              <Check className="ml-auto h-3 w-3 text-emerald/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const steps = [
  {
    step: "01",
    icon: TreePine,
    title: "Plant Your Trees",
    subtitle: "Connect & Ingest",
    description:
      "Connect your GitHub repositories. The Forest automatically ingests every file, from code and docs to READMEs and issues, then breaks them into semantic meaning. New commits sync automatically.",
    mockup: PlantMockup,
  },
  {
    step: "02",
    icon: MessageSquare,
    title: "Ask the Forest",
    subtitle: "Search & Discover",
    description:
      "Type any question in plain language. The AI searches across your entire knowledge base, finds the most relevant sources, and synthesizes a comprehensive answer.",
    mockup: AskMockup,
  },
  {
    step: "03",
    icon: FileCheck,
    title: "Get Sourced Answers",
    subtitle: "Verified & Cited",
    description:
      "Every answer comes with citations including exact files, line numbers, and links to original sources. Verify anything instantly. No hallucinations, just grounded knowledge.",
    mockup: AnswerMockup,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-surface py-24 md:py-32">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald/20 bg-emerald-bg px-4 py-1.5">
            <span className="text-xs font-semibold text-emerald-dark">
              Three Simple Steps
            </span>
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-text-heading md:text-4xl lg:text-5xl">
            How It Works
          </h2>
          <p className="text-base leading-relaxed text-text-secondary md:text-lg">
            From scattered repos to instant answers. Watch the journey.
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          {steps.map((step, i) => {
            const isReversed = i % 2 !== 0;
            const Mockup = step.mockup;

            return (
              <div key={step.step}>
                <div
                  className={`flex flex-col items-center gap-8 lg:flex-row lg:gap-16 ${
                    isReversed ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  <div className="flex flex-1 items-start gap-5">
                    <div className="flex shrink-0 flex-col items-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-bg">
                        <step.icon className="h-8 w-8 text-emerald-dark" />
                      </div>
                    </div>
                    <div className="pt-1">
                      <div className="mb-1 flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-dark">
                          Step {step.step}
                        </span>
                        <span className="text-xs text-text-muted">
                          {step.subtitle}
                        </span>
                      </div>
                      <h3 className="mb-3 text-2xl font-bold text-text-heading md:text-3xl">
                        {step.title}
                      </h3>
                      <p className="max-w-md text-sm leading-relaxed text-text-secondary">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <div className="w-full flex-1 lg:max-w-md">
                    <Mockup />
                  </div>
                </div>

                {i < steps.length - 1 && <StepConnector />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
