import { FileSearch, Zap, Brain } from "lucide-react";
import AnimateOnScroll, { StaggerContainer, StaggerItem } from "./AnimateOnScroll";

const reasons = [
  {
    icon: FileSearch,
    title: "Sourced & Cited Answers",
    description:
      "Every answer traces back to its roots. Real source files, real line numbers, real documentation. No hallucinations, just verified knowledge.",
  },
  {
    icon: Zap,
    title: "Real-Time Ecosystem Sync",
    description:
      "The Forest grows as the ecosystem grows. New repos are ingested automatically, documentation updates flow in, and knowledge stays current.",
  },
  {
    icon: Brain,
    title: "Deep Code Understanding",
    description:
      "Goes beyond surface-level search. Understands smart contract logic, cross-project dependencies, and the hidden connections between repos.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="relative bg-surface py-24 md:py-32">
      <div className="bg-grid-light pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <AnimateOnScroll className="mx-auto mb-16 max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-text-heading md:text-4xl lg:text-5xl">
            Why Choose{" "}
            <span className="text-gradient-emerald">the Forest?</span>
          </h2>
          <p className="text-base leading-relaxed text-text-secondary md:text-lg">
            Don&apos;t dig through 50+ repositories. Just ask and get answers
            with real citations.
          </p>
        </AnimateOnScroll>

        <StaggerContainer className="grid gap-6 md:grid-cols-3 lg:gap-8" staggerDelay={0.12}>
          {reasons.map((reason) => (
            <StaggerItem key={reason.title}>
              <div className="card card-hover group rounded-2xl p-8 transition-all duration-300 lg:p-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-bg transition-colors group-hover:bg-emerald/10">
                  <reason.icon className="h-7 w-7 text-emerald-dark" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-text-heading">
                  {reason.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {reason.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
