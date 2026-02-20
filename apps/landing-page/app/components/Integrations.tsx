import {
  GitBranch,
  MessageCircle,
  Globe,
  Terminal,
  FileCode,
  Bot,
  Webhook,
  Blocks,
} from "lucide-react";
import AnimateOnScroll, { StaggerContainer, StaggerItem } from "./AnimateOnScroll";

const APP_URL = "https://app.tokamakforest.com/";

const integrations = [
  { name: "GitHub", icon: GitBranch, description: "Auto-sync repos" },
  { name: "Discord", icon: MessageCircle, description: "Bot integration" },
  { name: "REST API", icon: Globe, description: "Full HTTP API" },
  { name: "CLI", icon: Terminal, description: "Command line tool" },
  { name: "SDK", icon: FileCode, description: "npm package" },
  { name: "Slack", icon: Bot, description: "Workspace bot" },
  { name: "Webhooks", icon: Webhook, description: "Event triggers" },
  { name: "SC", icon: Blocks, description: "Solidity parsing" },
];

export default function Integrations() {
  return (
    <section id="integrations" className="section-dark relative py-24 md:py-32">
      <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <AnimateOnScroll variant="slide-left" duration={0.7}>
            <h2 className="mb-5 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Integrates with
              <br />
              <span className="text-gradient-emerald-light">
                your favorite tools
              </span>
            </h2>
            <p className="mb-8 max-w-lg text-base leading-relaxed text-white/60 md:text-lg">
              The Forest connects with the tools your team already uses.
              Auto-sync from GitHub, query from Discord, build custom workflows
              with our API. The knowledge goes where you need it.
            </p>
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald transition-colors hover:text-emerald-light"
            >
              Explore integrations
              <span>→</span>
            </a>
          </AnimateOnScroll>

          <StaggerContainer
            className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4"
            staggerDelay={0.06}
          >
            {integrations.map((integration) => (
              <StaggerItem key={integration.name} variant="scale-up">
                <div className="card-dark card-dark-hover group flex flex-col items-center gap-3 rounded-xl p-5 text-center transition-all duration-300">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-emerald/15">
                    <integration.icon className="h-5 w-5 text-white/50 transition-colors group-hover:text-emerald" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {integration.name}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {integration.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
