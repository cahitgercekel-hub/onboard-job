import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, LabelList } from "recharts";
import { Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildRoleStats, type RoleCategory } from "@/lib/roleCategory";
import type { Job } from "@/lib/types";

interface Props {
  jobs: Job[];
  selected: RoleCategory | null;
  onSelect: (cat: RoleCategory | null) => void;
}

export function RoleDistribution({ jobs, selected, onSelect }: Props) {
  const stats = useMemo(() => buildRoleStats(jobs), [jobs]);

  const insight = useMemo(() => {
    if (stats.length === 0) return null;
    const top = stats[0];
    const avg = top.avgScore != null ? `where your average match score is ${top.avgScore}%` : "with no scored applications yet";
    return `Your highest volume of applications is in ${top.category}, ${avg}.`;
  }, [stats]);

  const data = stats.map((s) => ({
    name: s.category,
    count: s.count,
    avgScore: s.avgScore ?? 0,
    hasScore: s.avgScore != null,
  }));

  return (
    <div className="surface-card p-3 md:p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" /> Role Concentration
        </h2>
        {selected && (
          <Button size="sm" variant="ghost" onClick={() => onSelect(null)} className="h-7 text-xs">
            <X className="h-3 w-3" /> Clear filter: {selected}
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          No applied roles yet. Move jobs out of "Saved" to start tracking distribution.
        </p>
      ) : (
        <>
          <div className="w-full" style={{ height: Math.max(180, data.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p: any = payload[0].payload;
                    return (
                      <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                        <div className="font-semibold">{p.name}</div>
                        <div>Applications: <span className="font-medium">{p.count}</span></div>
                        <div>Avg match score: <span className="font-medium">{p.hasScore ? `${p.avgScore}%` : "—"}</span></div>
                        <div className="text-muted-foreground mt-1">Click to filter analytics</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} onClick={(d: any) => onSelect(d.name as RoleCategory)} cursor="pointer">
                  {data.map((d, i) => {
                    const dim = selected && selected !== d.name;
                    const intensity = d.hasScore ? Math.min(100, d.avgScore) : 50;
                    const opacity = dim ? 0.25 : 0.4 + (intensity / 100) * 0.6;
                    return (
                      <Cell
                        key={i}
                        fill="hsl(var(--accent))"
                        opacity={opacity}
                        stroke={selected === d.name ? "hsl(var(--accent))" : "transparent"}
                        strokeWidth={selected === d.name ? 2 : 0}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="avgScore"
                    position="right"
                    formatter={(v: number) => (v > 0 ? `${v}%` : "—")}
                    style={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {insight && (
            <p className="text-[11px] text-muted-foreground mt-3 italic">{insight}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Bar opacity reflects average match quality. Click any bar to filter the page.
          </p>
        </>
      )}
    </div>
  );
}
