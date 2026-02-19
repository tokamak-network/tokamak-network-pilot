import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex Chen",
    role: "Smart Contract Developer",
    org: "Building on Titan L2",
    quote:
      "I used to spend hours digging through repos trying to understand how the staking contracts interact. Now I just ask the Forest and get the exact file and line number. It's completely changed my workflow.",
    stars: 5,
  },
  {
    name: "Sarah Kim",
    role: "Ecosystem Lead",
    org: "Tokamak Network",
    quote:
      "Onboarding new team members went from weeks to days. They ask the Forest about any part of our infrastructure and get sourced answers immediately. The citation feature is what makes it trustworthy.",
    stars: 5,
  },
  {
    name: "David Park",
    role: "DeFi Developer",
    org: "TON Ecosystem Builder",
    quote:
      "The SDK integration was seamless. We embedded Forest queries directly into our development pipeline. Now our docs are always up-to-date because they're generated from actual source code.",
    stars: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="section-dark relative py-24 md:py-32">
      <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            What our builders say
          </h2>
          <p className="text-base leading-relaxed text-white/60 md:text-lg">
            Developers across the Tokamak ecosystem trust the Forest for
            accurate, sourced knowledge.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="card-dark card-dark-hover rounded-2xl p-8 transition-all duration-300"
            >
              <div className="mb-5 flex gap-1">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="mb-6 text-sm leading-relaxed text-white/60">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 border-t border-white/8 pt-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald/15 text-sm font-semibold text-emerald">
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs text-white/40">
                    {t.role} · {t.org}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
