import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function RecalculateFitnessSection() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleRecalculate() {
    if (!user) return;
    setRunning(true);
    setProgress(null);
    try {
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select("id, job_description")
        .eq("user_id", user.id)
        .eq("status", "saved");

      if (error) throw error;

      const eligible = (jobs ?? []).filter((j) => (j.job_description ?? "").trim().length > 0);

      if (eligible.length === 0) {
        toast.info("No saved jobs with a description to score.");
        return;
      }

      setProgress({ done: 0, total: eligible.length });
      let ok = 0;
      let fail = 0;

      for (let i = 0; i < eligible.length; i++) {
        const job = eligible[i];
        try {
          const { error: fnErr } = await supabase.functions.invoke("calculate-fitness", {
            body: { jobId: job.id },
          });
          if (fnErr) throw fnErr;
          ok++;
        } catch (e: any) {
          console.error("recalc failed for", job.id, e);
          fail++;
        }
        setProgress({ done: i + 1, total: eligible.length });
      }

      if (fail === 0) toast.success(`Recalculated fitness for ${ok} job${ok === 1 ? "" : "s"}.`);
      else toast.warning(`Done. ${ok} succeeded, ${fail} failed.`);
    } catch (e: any) {
      toast.error(e?.message || "Recalculation failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="surface-card p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">Fitness scoring</h2>
      </div>
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
        <div>
          <Label className="text-sm font-medium">Recalculate saved jobs</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Re-runs AI fitness scoring against your current baseline CV for every job in the Saved column with a description.
            {progress && running && ` Processing ${progress.done}/${progress.total}…`}
          </p>
        </div>
        <Button variant="outline" onClick={handleRecalculate} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {running ? "Recalculating…" : "Recalculate fitness"}
        </Button>
      </div>
    </section>
  );
}
