import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import { useAiAccess } from "@/lib/aiAccess";
import {
  APPLICATION_TYPES,
  INDUSTRIES,
  WORK_MODELS,
  type ApplicationType,
  type Industry,
  type WorkModel,
  type Job,
} from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExtracted: (job: Omit<Job, "id" | "createdAt" | "updatedAt">) => void;
}

export function AutoAddDialog({ open, onOpenChange, onExtracted }: Props) {
  const { requestAi } = useAiAccess();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!text.trim() || text.trim().length < 30) {
      return toast.error("Paste a job description (at least a few sentences).");
    }
    if (!(await requestAi("extract"))) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("career-assistant", {
        body: { tool: "extract", payload: { text, url: url.trim() || undefined } },
      });
      if (error) throw new Error((error as any)?.context?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      const ex = (data as any).extracted as {
        company?: string;
        role?: string;
        applicationType?: string;
        industry?: string;
        workModel?: string;
        location?: string;
        jobDescription?: string;
        notes?: string;
      };

      const appType = APPLICATION_TYPES.includes(ex.applicationType as ApplicationType)
        ? (ex.applicationType as ApplicationType)
        : undefined;
      const industry = INDUSTRIES.includes(ex.industry as Industry)
        ? (ex.industry as Industry)
        : undefined;
      const workModel = WORK_MODELS.includes(ex.workModel as WorkModel)
        ? (ex.workModel as WorkModel)
        : undefined;

      onExtracted({
        company: ex.company?.trim() || "Unknown company",
        role: ex.role?.trim() || "Unknown role",
        url: url.trim() || undefined,
        status: "saved",
        applicationType: appType,
        industry,
        workModel,
        location: ex.location?.trim() || undefined,
        jobDescription: ex.jobDescription?.trim() || undefined,
        notes: ex.notes?.trim() || undefined,
      });
      toast.success("Job auto-filled — review and save.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Auto-add failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Auto-add with AI
          </DialogTitle>
          <DialogDescription>
            Paste a job description and we'll extract the key details. You can review and edit before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="auto-url">Job URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="auto-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              disabled={loading}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="auto-text">Job description</Label>
            <Textarea
              id="auto-text"
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full job posting here…"
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={run} disabled={loading} variant="ai">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Extracting…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" /> Extract & fill
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
