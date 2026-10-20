import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Wand2, Copy, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAiAccess } from "@/lib/aiAccess";
import { SKILL_DICTIONARY } from "@/lib/skills";
import type { Job } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job: Job;
}

const QUICK_ACTIONS: { label: string; instruction: string }[] = [
  { label: "Make more formal", instruction: "Rewrite the cover letter in a noticeably more formal, professional register. Keep the same length and structure." },
  { label: "Shorten", instruction: "Tighten the cover letter to roughly 60% of its current length. Keep the strongest specifics; cut filler." },
  { label: "Add metrics", instruction: "Rewrite, weaving in 2-3 plausible quantifiable achievements (numbers, %, scope) where they reinforce claims." },
  { label: "Friendlier", instruction: "Soften the tone to be warm and conversational while staying professional. Avoid slang." },
];

// Highlight occurrences of any skill keyword in the JD.
function highlightJD(text: string): { html: string } {
  if (!text) return { html: "" };
  const escapedSkills = SKILL_DICTIONARY
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[+#./()]/g, "\\$&"));
  const re = new RegExp(`\\b(${escapedSkills.join("|")})\\b`, "gi");
  // Escape HTML first, then highlight
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = esc.replace(re, '<mark class="bg-accent/25 text-foreground rounded px-0.5">$1</mark>');
  return { html };
}

function buildLocalDraft(job: Job): string {
  const company = job.company || "your team";
  const role = job.role || "this role";
  return `Dear ${company} Hiring Team,

I'm writing to express my strong interest in the ${role} position at ${company}. The work your team is doing aligns closely with my background and the kind of impact I want to drive next.

In my most recent roles I've focused on delivering measurable outcomes — shipping cross-functional initiatives, partnering with stakeholders, and turning ambiguous problems into clear, prioritized work. I'm comfortable owning end-to-end execution while staying tightly aligned with business goals.

What draws me specifically to ${company} is the combination of the problem space you're tackling and the bar your team holds itself to. I'd welcome the chance to contribute, learn quickly, and help raise that bar further.

I've attached my CV for reference and would love to set up a short conversation to explore fit.

Thank you for your time and consideration.

Best regards,
[Your name]`;
}

export function CoverLetterStudio({ open, onOpenChange, job }: Props) {
  const { requestAi } = useAiAccess();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (open && !initialized.current) {
      setDraft(buildLocalDraft(job));
      initialized.current = true;
    }
    if (!open) initialized.current = false;
  }, [open, job]);

  const jdHtml = useMemo(() => highlightJD(job.jobDescription || ""), [job.jobDescription]);

  const runQuickAction = async (instruction: string) => {
    if (!draft.trim()) return toast.error("No draft to refine yet.");
    if (!(await requestAi("cover_letter"))) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("career-assistant", {
        body: {
          tool: "polish",
          payload: {
            text: `${instruction}\n\n----\n${draft}`,
            language: "English",
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const polished = (data as any)?.structured?.polished;
      if (!polished) throw new Error("No content returned");
      setDraft(polished);
      toast.success("Draft updated");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't refine draft");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[90vh] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-accent" /> Cover Letter Studio
          </DialogTitle>
          <DialogDescription className="text-xs">
            {job.role} @ {job.company} — key terms in the JD are highlighted on the left.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 max-h-[70vh]">
          {/* JD with highlights */}
          <div className="border-r border-border bg-muted/20">
            <div className="px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
              Job description
            </div>
            <ScrollArea className="h-[60vh]">
              <div
                className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground"
                dangerouslySetInnerHTML={{ __html: jdHtml.html || "<em class='text-muted-foreground'>No job description on this job yet.</em>" }}
              />
            </ScrollArea>
          </div>

          {/* Editor */}
          <div className="flex flex-col">
            <div className="px-4 py-2 flex items-center justify-between border-b border-border">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Draft</span>
              <Button variant="ghost" size="sm" onClick={copy} disabled={busy}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 rounded-none border-0 focus-visible:ring-0 resize-none text-sm leading-relaxed font-mono"
              style={{ minHeight: "50vh" }}
            />
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Wand2 className="h-3 w-3" /> Quick actions
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((a) => (
                  <Button
                    key={a.label}
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => runQuickAction(a.instruction)}
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
