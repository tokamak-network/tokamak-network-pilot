import { ArrowRight, TreePine } from "lucide-react";
import AnimateOnScroll from "./AnimateOnScroll";

const APP_URL = "https://app.tokamakforest.com/";

export default function CTA() {
  return (
    <section id="cta" className="section-dark relative py-24 md:py-32">
      <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-radial-emerald-center" />

      <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
        <AnimateOnScroll variant="scale-up" duration={0.6}>
          <div className="mb-8 inline-flex items-center justify-center rounded-full bg-emerald/15 p-5">
            <TreePine className="h-10 w-10 text-emerald" />
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.1}>
          <h2 className="mb-5 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            Ready to explore
            the Forest?
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.2}>
          <p className="mx-auto mb-12 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
            Stop digging through repositories. Start asking questions and getting
            sourced answers in seconds. The Forest is open. Walk in.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.3}>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="glow-emerald inline-flex items-center gap-2.5 rounded-xl bg-emerald px-9 py-4.5 text-sm font-semibold text-white transition-all hover:bg-emerald-light hover:shadow-lg"
            >
              Start Exploring Free
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/tokamak-network/tokamak-network-pilot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-9 py-4.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              View Documentation
            </a>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
