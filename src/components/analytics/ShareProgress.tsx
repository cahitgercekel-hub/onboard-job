import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Share2, BarChart3, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MilestoneCard, type Milestone } from "./MilestoneCard";
import type { Job } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  jobs: Job[];
  funnelRef: React.RefObject<HTMLDivElement>;
}

function pickMilestone(jobs: Job[]): Milestone {
  const total = jobs.length;
  const interviewing = jobs.filter((j) => j.status === "interviewing").length;
  const offers = jobs.filter((j) => j.status === "offer").length;
  const aiOptimized = jobs.filter((j) => typeof j.fitnessScore === "number").length;

  if (offers >= 1) {
    return { emoji: "🎯", headline: `${offers} offer${offers === 1 ? "" : "s"} on the table`, subline: "Tracking, analyzing and optimizing my way to my dream job with JobFlow." };
  }
  if (total >= 100) {
    return { emoji: "📊", headline: `I just tracked my ${total}th opportunity`, subline: "Using JobFlow to stay organized and let AI sharpen my CV." };
  }
  if (interviewing >= 5) {
    return { emoji: "🚀", headline: `${interviewing} active interviews this round`, subline: "My JobFlow AI-optimized CV is opening doors." };
  }
  if (aiOptimized >= 10) {
    return { emoji: "✨", headline: `${aiOptimized} jobs AI-analyzed`, subline: "Tailoring my approach with JobFlow's fitness scoring." };
  }
  return { emoji: "📈", headline: `Tracking ${total} opportunities`, subline: "Analyzing my way to my dream job with JobFlow." };
}

async function captureNode(node: HTMLElement): Promise<Blob | null> {
  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}

async function shareOrDownload(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as any;
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "JobFlow", text });
      return;
    } catch {/* user cancelled or error — fall through to download */}
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Image downloaded");
}

export function ShareProgress({ jobs, funnelRef }: Props) {
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const milestoneRef = useRef<HTMLDivElement>(null);

  const milestone = useMemo(() => pickMilestone(jobs), [jobs]);
  const stats = useMemo(() => ({
    total: jobs.length,
    interviewing: jobs.filter((j) => j.status === "interviewing").length,
    offers: jobs.filter((j) => j.status === "offer").length,
  }), [jobs]);

  const shareFunnel = async () => {
    if (!funnelRef.current) return toast.error("Funnel chart not ready yet.");
    setBusy(true);
    try {
      const blob = await captureNode(funnelRef.current);
      if (!blob) throw new Error("Couldn't capture image");
      await shareOrDownload(blob, `jobflow-funnel-${Date.now()}.png`, "My job-search funnel from JobFlow 📊");
    } catch (e: any) {
      toast.error(e?.message || "Share failed");
    } finally {
      setBusy(false);
    }
  };

  const shareMilestone = async () => {
    setMilestoneOpen(true);
  };

  const captureMilestone = async () => {
    if (!milestoneRef.current) return;
    setBusy(true);
    try {
      const blob = await captureNode(milestoneRef.current);
      if (!blob) throw new Error("Couldn't capture image");
      await shareOrDownload(blob, `jobflow-milestone-${Date.now()}.png`, milestone.headline);
      setMilestoneOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Share failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={busy}>
            <Share2 className="h-3.5 w-3.5" /> Share my progress
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Share what?</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={shareFunnel} className="cursor-pointer">
            <BarChart3 className="h-4 w-4 mr-2" /> Share Funnel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareMilestone} className="cursor-pointer">
            <Sparkles className="h-4 w-4 mr-2" /> Share Milestone
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Share milestone</DialogTitle>
            <DialogDescription>JobFlow helps you track and AI-optimize — never auto-apply. This card celebrates your effort.</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] flex justify-center bg-muted/30 rounded-md py-4">
            <div style={{ transform: "scale(0.55)", transformOrigin: "top center" }}>
              <MilestoneCard ref={milestoneRef} milestone={milestone} stats={stats} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneOpen(false)}>Cancel</Button>
            <Button onClick={captureMilestone} disabled={busy}>
              <Download className="h-4 w-4" /> {busy ? "Capturing…" : "Share / download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
