import { useEffect, useMemo, useState } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip,
} from "recharts";
import { Sparkles, Target, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildSkillStats, prettySkill, topMissingSkills, type SkillStat } from "@/lib/skills";
import type { Job } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  jobs: Job[];
}

interface OptimizedBullet {
  text: string;
  skillsCovered: string[];
}

export function SkillHeatmap({ jobs }: Props) {
  const { user } = useAuth();
  const [cvText, setCvText] = useState<string | null>(null);
  const [loadingCv, setLoadingCv] = useState(true);

  useEffect(() => {
    if (!user) { setLoadingCv(false); return; }
    (async () => {
      const { data } = await supabase
        .from("cv_baseline")
        .select("cv_text")
        .eq("user_id", user.id)
        .maybeSingle();
      setCvText(data?.cv_text ?? null);
      setLoadingCv(false);
    })();
  }, [user]);

  const stats = useMemo(() => buildSkillStats(jobs, cvText, { topN: 10 }), [jobs, cvText]);
  const missing = useMemo(() => topMissingSkills(stats, 3), [stats]);

  const chartData = stats.map((s) => ({
    skill: prettySkill(s.skill),
    Demand: s.demand,
    "Your CV": s.coverage,
  }));

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bullets, setBullets] = useState<OptimizedBullet[] | null>(null);
  const [summary, setSummary] = useState<string>("");

  const optimizeCv = async () => {
    if (!cvText?.trim()) {
      toast.error("Add your CV in Settings → Baseline CV first.");
      return;
    }
    if (missing.length === 0) {
      toast.info("Your CV already covers the top demanded skills 🎉");
      return;
    }
    setOpen(true);
    setBusy(true);
    setBullets(null);
    setSummary("");
    try {
      const { data, error } = await supabase.functions.invoke("career-assistant", {
        body: {
          tool: "optimize_cv",
          payload: {
            cv: cvText,
            missingSkills: missing,
            topSkills: stats.map((s) => s.skill),
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const s = (data as any)?.structured;
      setSummary(s?.summary ?? "");
      setBullets(s?.bullets ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't optimize CV");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface-card p-3 md:p-5 overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" /> Skill Heatmap
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Top {stats.length} skills across {jobs.filter((j) => j.jobDescription).length} JDs
        </span>
      </div>

      {loadingCv ? (
        <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : stats.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Paste job descriptions on a few jobs to see how their skills overlap with yours.
        </p>
      ) : (
        <>
          <div className="w-full h-[300px] md:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} outerRadius="78%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="Demand"
                  dataKey="Demand"
                  stroke="hsl(var(--accent))"
                  fill="hsl(var(--accent))"
                  fillOpacity={0.35}
                />
                <Radar
                  name="Your CV"
                  dataKey="Your CV"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-warning" /> Top missing:
              </span>
              {missing.length === 0 ? (
                <span className="text-success">All covered ✓</span>
              ) : missing.map((m) => (
                <Badge key={m} variant="outline" className="bg-warning/10 text-warning-foreground border-warning/40">
                  {prettySkill(m)}
                </Badge>
              ))}
            </div>
            <Button size="sm" onClick={optimizeCv} disabled={missing.length === 0 || !cvText?.trim()}>
              <Sparkles className="h-3.5 w-3.5" /> Optimize CV
            </Button>
          </div>

          {!cvText?.trim() && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Add your CV in <strong>Settings → Baseline CV</strong> to compare against your skills.
            </p>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> CV optimization suggestions
            </DialogTitle>
            <DialogDescription>
              Rewritten resume bullets that authentically incorporate the missing skills: {missing.map(prettySkill).join(", ")}.
            </DialogDescription>
          </DialogHeader>
          {busy ? (
            <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Drafting suggestions…
            </div>
          ) : (
            <ScrollArea className="max-h-[55vh] pr-3">
              {summary && <p className="text-sm text-muted-foreground mb-4">{summary}</p>}
              <ul className="space-y-3">
                {(bullets ?? []).map((b, i) => (
                  <li key={i} className="rounded-md border border-border bg-card p-3">
                    <p className="text-sm text-foreground leading-relaxed">{b.text}</p>
                    {b.skillsCovered?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {b.skillsCovered.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button
              disabled={busy || !bullets || bullets.length === 0}
              onClick={async () => {
                const text = (bullets ?? []).map((b) => `• ${b.text}`).join("\n");
                try {
                  await navigator.clipboard.writeText(text);
                  toast.success("Bullets copied");
                } catch { toast.error("Couldn't copy"); }
              }}
            >
              Copy bullets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
