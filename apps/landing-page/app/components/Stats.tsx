import { BarChart3, TrendingUp, Activity, Users } from "lucide-react";

const stats = [
  { label: "Repos Ingested", value: "50+", icon: Activity },
  { label: "Files Indexed", value: "15K+", icon: BarChart3 },
  { label: "Questions Answered", value: "10K+", icon: TrendingUp },
  { label: "Active Users", value: "500+", icon: Users },
];

function DashboardMockup() {
  return (
    <div className="mockup-window overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3.5">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-500">Dashboard</span>
      </div>
      <div className="p-6">
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: "Queries Today", value: "1,247", change: "+12%" },
            { label: "Avg Response", value: "1.3s", change: "-8%" },
            { label: "Accuracy", value: "96.4%", change: "+2%" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl bg-white/8 p-4">
              <p className="text-xs text-slate-500">{metric.label}</p>
              <p className="mt-1 text-xl font-bold text-white">
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-emerald">{metric.change}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white/8 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-white">Query Volume</p>
            <p className="text-xs text-slate-500">Last 7 days</p>
          </div>
          <div className="flex items-end gap-2">
            {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-emerald/70 to-emerald/25"
                  style={{ height: `${h}px` }}
                />
                <span className="text-xs text-slate-500">
                  {["M", "T", "W", "T", "F", "S", "S"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Stats() {
  return (
    <section className="relative bg-surface-secondary py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-radial-emerald-center" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-text-heading md:text-4xl lg:text-5xl">
            Effortless knowledge,{" "}
            <span className="text-gradient-emerald">powerful answers,</span> and
            grounded citations.
          </h2>
        </div>

        <div className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card rounded-2xl p-6 text-center lg:p-8">
              <stat.icon className="mx-auto mb-3 h-6 w-6 text-emerald-dark" />
              <p className="text-3xl font-bold text-text-heading lg:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-3xl">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
