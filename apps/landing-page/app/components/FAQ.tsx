"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "What is Tokamak Forest?",
    answer:
      "Tokamak Forest is an AI-powered knowledge hub that ingests every GitHub repo, document, and resource across the Tokamak Network ecosystem, then lets anyone ask questions and get sourced, cited answers in real time. Think of it as ChatGPT, but it only knows Tokamak.",
  },
  {
    question: "How does the Forest find answers?",
    answer:
      "We use Retrieval-Augmented Generation (RAG). When you ask a question, the Forest semantically searches across all ingested content including code files, documentation, issues, and READMEs, finds the most relevant chunks, and uses AI to synthesize a comprehensive answer. Every piece of information is traced back to its original source.",
  },
  {
    question: "What repositories are indexed?",
    answer:
      "The Forest indexes 50+ repositories from the Tokamak Network GitHub organization, including Titan L2, staking contracts, bridge infrastructure, governance, and SDK projects. New repos are automatically discovered and ingested. You can also add custom repositories for your own projects.",
  },
  {
    question: "Are the answers reliable? How do I verify them?",
    answer:
      "Every answer includes citations with exact file paths and line numbers. You can click any citation to jump directly to the source. The Forest never makes up information. If it can't find a grounded answer in the indexed sources, it tells you. This is what separates it from generic AI chatbots.",
  },
  {
    question: "Is there an API or SDK available?",
    answer:
      "Yes. We provide a full REST API (documented with Swagger at /docs) and a TypeScript SDK (@tokamak-pilot/sdk) that you can install via npm. Use them to integrate Forest queries into Discord bots, CI pipelines, documentation sites, or any custom workflow.",
  },
  {
    question: "Is Tokamak Forest free to use?",
    answer:
      "Tokamak Forest offers a generous free tier for exploring the public Tokamak ecosystem knowledge base. For teams that need private project spaces, higher query limits, and API access, we offer professional plans. Contact us for enterprise pricing.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-surface py-24 md:py-32">
      <div className="bg-grid-light pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-3xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-text-heading md:text-4xl lg:text-5xl">
            Your Questions, Answered
          </h2>
          <p className="text-base leading-relaxed text-text-secondary md:text-lg">
            Everything you need to know about the Forest.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
          className="space-y-3"
        >
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className={`card overflow-hidden rounded-2xl transition-all duration-300 ${
                  isOpen ? "shadow-md shadow-emerald/5" : ""
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-7 py-6 text-left"
                >
                  <span className="pr-4 text-sm font-semibold text-text-heading md:text-base">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-text-muted transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-emerald-dark" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-7 pb-6 text-sm leading-relaxed text-text-secondary md:text-base">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
