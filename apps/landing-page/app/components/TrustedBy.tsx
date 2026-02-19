import { GitBranch, Layers, Coins, Shield, Blocks, Cpu } from "lucide-react";

const ecosystemPartners = [
  { name: "Tokamak Network", icon: Blocks },
  { name: "Titan L2", icon: Layers },
  { name: "TON Staking", icon: Coins },
  { name: "Ethereum", icon: Shield },
  { name: "GitHub", icon: GitBranch },
  { name: "Open Infra", icon: Cpu },
];

export default function TrustedBy() {
  return (
    <section className="border-b border-border bg-surface-secondary py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="mb-10 text-center text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Powering Knowledge Across the Ecosystem
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
          {ecosystemPartners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center gap-2.5 opacity-40 transition-opacity duration-300 hover:opacity-70"
            >
              <partner.icon className="h-5 w-5 text-text-secondary" />
              <span className="text-sm font-medium text-text-secondary">
                {partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
