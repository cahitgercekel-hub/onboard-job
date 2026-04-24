import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { FlaskConical } from "lucide-react";
import { useCvVersions } from "@/lib/cvVersionsStore";
import type { Job } from "@/lib/types";

interface Props {
  jobs: Job[];
}

interface VersionRow {
  id: string;
  name: string;
  applied: number;
  reachedInterview: number;
  rate: number;     // 0-100
  color: string;
}

// A job "reached interview" if its current status is interviewing/offer
// OR it's archived but its previous status was interviewing/offer.
function reachedInterview(j: Job): boolean {
  if (j.status === "interviewing" || j.status === "offer") return true;
  if (j.status === "archived" && (j.previousStatus === "interviewing" || j.previousStatus === "offer")) return true;
  return false;
}

// A job "was applied" if it's past saved (i.e. moved to applied or further).
function wasApplied(j: Job): boolean {
  if (j.status === "saved") return false;
  if (j.status === "archived" && (j.previousStatus === "saved" || j.previousStatus == null)) return false;
  return true;
}

const PALETTE = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];

export function ABTestingLab({ jobs }: Props) {
  const { versions } = useCvVersions();

  const rows: VersionRow[] = useMemo(() => {
    return versions.map((v, i) => {
      const versionJobs = jobs.filter((j) => j.cvVersionId === v.id);
      const applied = versionJobs.filter(wasApplied).length;
      const reached = versionJobs.filter(reachedInterview).length;
      const rate = applied > 0 ? Math.round((reached / applied) * 100) : 0;
      return {
        id: v.id,
        name: v.name,
        applied,
        reachedInterview: reached,
        rate,
        color: PALETTE[i % PALETTE.length],
      };
    });
  }, [versions, jobs]);

  const taggedTotal = rows.reduce((sum, r) => sum + r.applied, 0);

  return (
    <div className="surface-card p-3 md:p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent" /> A/B Testing Lab
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {rows.length} {rows.length === 1 ? "version" : "versions"} · {taggedTotal} tagged applications
        </span>
      </div>

      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Create CV versions in <strong>Settings → CV Versions</strong>, then tag your jobs to see which one performs best.
        </p>
      ) : taggedTotal === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Tag jobs with the CV version you used (in the job edit dialog) to compare their conversion rates here.
        </p>
      ) : (
        <>
          <div className="w-full h-[260px] md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={36}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--popover-foreground))",
                    fontSize: 12,
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as VersionRow;
                    return (
                      <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-muted-foreground mt-1">
                          {p.reachedInterview}/{p.applied} reached interview
                        </div>
                        <div className="mt-1">
                          Conversion: <span className="font-medium text-foreground">{p.rate}%</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                  {rows.map((r) => <Cell key={r.id} fill={r.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-md border border-border bg-card/50 px-3 py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: r.color }} />
                    {r.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.reachedInterview}/{r.applied} → interview
                  </div>
                </div>
                <div className="text-base font-semibold text-foreground shrink-0">{r.rate}%</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
