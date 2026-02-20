import { ArrowRight, Sparkles } from "lucide-react";
import {
  GitBranch,
  Layers,
  Coins,
  Shield,
  Blocks,
  Cpu,
} from "lucide-react";

const APP_URL = "https://app.tokamakforest.com/";

const ecosystemPartners = [
  { name: "Tokamak Network", icon: Blocks },
  { name: "Titan L2", icon: Layers },
  { name: "TON Staking", icon: Coins },
  { name: "Ethereum", icon: Shield },
  { name: "GitHub", icon: GitBranch },
  { name: "Open Infra", icon: Cpu },
];

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-[#060606]">
      <div className="hero-glow-animate pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]" />

      <div className="relative flex flex-1 flex-col justify-center mx-auto w-full max-w-7xl px-6 pt-28 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hero-animate hero-animate-delay-1 group mb-10 inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 transition-all hover:border-emerald/20 hover:bg-white/[0.05]"
          >
            <span className="rounded-md bg-emerald px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              New
            </span>
            <span className="text-xs text-white/50 transition-colors group-hover:text-white/70">
              AI-Powered Knowledge for Tokamak Ecosystem
            </span>
            <ArrowRight className="h-3 w-3 text-white/30 transition-colors group-hover:text-emerald" />
          </a>

          <h1 className="hero-animate hero-animate-delay-2 mb-8 text-[2.75rem] font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[5rem]">
            Navigate the knowledge
            <br />
            forest of{" "}
            <span className="text-emerald">Tokamak Network</span>
          </h1>

          <p className="hero-animate hero-animate-delay-3 mx-auto max-w-2xl text-base leading-relaxed text-white/40 md:text-[17px]">
            Built for efficiency and scalability, it ingests every repo and
            document across the ecosystem and delivers sourced, cited answers
            instantly.
          </p>
        </div>
      </div>

      <div className="hero-animate hero-animate-delay-4 relative mx-auto w-full max-w-7xl px-6 pb-10 pt-8 lg:px-8">
        <p className="mb-6 text-center text-xs text-white/50">
          Trusted by developers and teams across the ecosystem
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
          {ecosystemPartners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center gap-2 transition-all duration-300 hover:text-emerald"
            >
              <partner.icon className="h-4 w-4 text-white transition-colors duration-300" />
              <span className="text-sm font-medium text-white transition-colors duration-300">
                {partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
