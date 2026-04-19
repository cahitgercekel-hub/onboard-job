import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { BarChart3 } from "lucide-react";
import { useJobs } from "@/lib/jobsStore";
import { STATUS_LABEL, STATUS_ORDER, type JobStatus } from "@/lib/types";

const COLOR_VAR: Record<JobStatus, string> = {
  saved: "var(--col-saved)",
  applied: "var(--col-applied)",
  interviewing: "var(--col-interviewing)",
  offer: "var(--col-offer)",
  rejected: "var(--col-rejected)",
};

export default function Analytics() {
  const { jobs } = useJobs();
  const { t } = useTranslation();

  const data = useMemo(() => {
    const counts: Record<JobStatus, number> = {
      saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0,
    };
    for (const j of jobs) counts[j.status]++;
    return STATUS_ORDER.map((s) => ({
      key: s,
      name: STATUS_LABEL[s],
      count: counts[s],
      color: `hsl(${COLOR_VAR[s]})`,
    }));
  }, [jobs]);

  const total = jobs.length;

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto">
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" /> {t("analytics.title")}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          {t("analytics.subtitle", { count: total })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5 md:mb-6">
        {data.map((d) => (
          <div key={d.key} className="surface-card p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
              <span className="truncate">{d.name}</span>
            </div>
            <div className="mt-1 text-xl md:text-2xl font-semibold text-foreground">{d.count}</div>
          </div>
        ))}
      </div>

      <div className="surface-card p-3 md:p-5 overflow-hidden">
        <h2 className="text-sm font-medium text-foreground mb-4">{t("analytics.chartTitle")}</h2>
        <div className="w-full h-[260px] md:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} interval={0} />
              <YAxis allowDecimals={false} width={28} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
