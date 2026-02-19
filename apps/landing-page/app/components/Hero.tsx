import { Search, ArrowRight, Sparkles } from "lucide-react";

const APP_URL = "https://app.tokamakforest.com/";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface-dark pb-20 pt-36 md:pb-28 md:pt-44 lg:pb-32 lg:pt-52">
      <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-radial-emerald-top" />

      <div className="absolute top-32 left-1/4 h-96 w-96 rounded-full bg-emerald/8 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald" />
            <span className="text-xs font-medium text-emerald-light">
              AI-Powered Knowledge Base for Tokamak Ecosystem
            </span>
          </div>

          <h1 className="mb-8 text-5xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl xl:text-8xl">
            Navigate the
            <br />
            knowledge{" "}
            <span className="text-gradient-emerald-light">forest</span>
          </h1>

          <p className="mx-auto mb-12 max-w-xl text-base leading-relaxed text-white/60 md:text-lg">
            Every repo, every document, every line of code. Ingested,
            understood, and connected. Ask anything and get sourced, cited
            answers in real time.
          </p>

          <div className="mb-14 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="glow-emerald-sm inline-flex items-center gap-2.5 rounded-xl bg-emerald px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-emerald-light hover:shadow-lg"
            >
              Explore the Forest
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              See How It Works
            </a>
          </div>

          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto block max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm transition-all hover:border-white/20"
          >
            <div className="flex items-center gap-3 rounded-xl bg-surface-dark-secondary/80 px-5 py-4">
              <Search className="h-5 w-5 shrink-0 text-white/30" />
              <span className="text-sm text-white/40">
                Ask: &quot;How does TON staking delegation work?&quot;
              </span>
              <div className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald/20">
                <ArrowRight className="h-4 w-4 text-emerald" />
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
