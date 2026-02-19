"use client";

import { useState, useEffect } from "react";
import { Menu, X, TreePine } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Integrations", href: "#integrations" },
  { label: "FAQ", href: "#faq" },
];

const APP_URL = "https://app.tokamakforest.com/";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-surface/90 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              scrolled ? "bg-emerald-bg" : "bg-white/10"
            }`}
          >
            <TreePine
              className={`h-5 w-5 ${
                scrolled ? "text-emerald-dark" : "text-emerald"
              }`}
            />
          </div>
          <span
            className={`text-lg font-semibold tracking-tight ${
              scrolled ? "text-text-heading" : "text-white"
            }`}
          >
            Tokamak{" "}
            <span className={scrolled ? "text-emerald-dark" : "text-emerald"}>
              Forest
            </span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                scrolled
                  ? "text-text-secondary hover:text-text-heading"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href={APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`hidden rounded-lg px-5 py-2 text-sm font-medium transition-all md:inline-flex ${
            scrolled
              ? "bg-emerald text-white hover:bg-emerald-dark"
              : "bg-white text-surface-dark hover:bg-white/90"
          }`}
        >
          Explore the App
        </a>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`md:hidden ${scrolled ? "text-text-heading" : "text-white"}`}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-surface/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-heading"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 border-t border-border pt-4">
              <a
                href={APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg bg-emerald px-3 py-2.5 text-center text-sm font-medium text-white"
              >
                Explore the App
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
