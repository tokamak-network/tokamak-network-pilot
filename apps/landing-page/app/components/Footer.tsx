import { TreePine, Github, Twitter, MessageCircle } from "lucide-react";

const APP_URL = "https://app.tokamakforest.com/";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Integrations", href: "#integrations" },
    { label: "API Docs", href: "https://github.com/tokamak-network/tokamak-network-pilot", external: true },
    { label: "SDK", href: "https://www.npmjs.com/package/@tokamak-pilot/sdk", external: true },
  ],
  Ecosystem: [
    { label: "Tokamak Network", href: "https://www.tokamak.network/", external: true },
    { label: "Rollup Hub", href: "https://rolluphub.tokamak.network/", external: true },
    { label: "TON Staking", href: "https://www.tokamak.network/#staking", external: true },
    { label: "GitHub", href: "https://github.com/tokamak-network", external: true },
  ],
  Resources: [
    { label: "Documentation", href: "https://github.com/tokamak-network/tokamak-network-pilot", external: true },
    { label: "Blog", href: "https://medium.com/tokamak-network", external: true },
    { label: "FAQ", href: "#faq" },
    { label: "Community", href: "https://discord.gg/tokamak", external: true },
  ],
};

const socialLinks = [
  { label: "GitHub", href: "https://github.com/tokamak-network", icon: Github },
  { label: "X (Twitter)", href: "https://x.com/tokaborator", icon: Twitter },
  { label: "Discord", href: "https://discord.gg/tokamak", icon: MessageCircle },
];

export default function Footer() {
  return (
    <footer className="section-dark border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <a href="/" className="mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/15">
                <TreePine className="h-5 w-5 text-emerald" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-white">
                Tokamak <span className="text-emerald">Forest</span>
              </span>
            </a>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-white/40">
              The AI brain of Tokamak Network. Ask anything, get sourced
              answers. Where knowledge grows.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white/40 transition-all hover:bg-emerald/15 hover:text-emerald"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-5 text-sm font-semibold text-white">
                {category}
              </h4>
              <ul className="space-y-3.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-sm text-white/40 transition-colors hover:text-white/70"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 md:flex-row">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Tokamak Forest. All rights
            reserved.
          </p>
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 transition-colors hover:text-emerald"
          >
            app.tokamakforest.com
          </a>
        </div>
      </div>
    </footer>
  );
}
