import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, Archive, ExternalLink, MapPin } from "lucide-react";
import { alarmFor, daysSince } from "@/lib/jobsStore";
import type { Job, WorkModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { usePrefs } from "@/lib/preferences";
import { FitnessRing } from "@/components/FitnessRing";

interface Props {
  job: Job;
  onClick: () => void;
  onArchive?: () => void;
  overlay?: boolean;
}

const WORK_MODEL_STYLES: Record<WorkModel, string> = {
  Remote: "bg-success/10 text-success border-success/30",
  Hybrid: "bg-accent/10 text-accent border-accent/30",
  "On-site": "bg-muted text-foreground/80 border-border",
};

export function JobCard({ job, onClick, onArchive, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  const { formatDate } = usePrefs();
  const alarm = alarmFor(job);
  const style = overlay ? undefined : { opacity: isDragging ? 0 : 1 };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    const target = e.target as HTMLElement;
    if (target.closest("a,button")) return;
    onClick();
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={handleClick}
      className={cn(
        "group surface-card p-3 transition-shadow hover:shadow-md select-none",
        // On mobile, prefer horizontal panning for scroll-snap; only drag on md+
        "touch-pan-x md:touch-none",
        overlay ? "cursor-grabbing" : "cursor-pointer md:cursor-grab md:active:cursor-grabbing",
        alarm === "warn" && "ring-1 ring-warning/50",
        alarm === "danger" && "ring-1 ring-destructive/60",
        overlay && "shadow-lg ring-1 ring-accent/40"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground truncate">{job.role}</div>
            <div className="text-xs text-muted-foreground truncate">{job.company}</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {alarm !== "none" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
                  alarm === "warn" ? "bg-warning/15 text-warning-foreground/90" : "bg-destructive/15 text-destructive"
                )}
                title={`No update for ${daysSince(job.updatedAt)} days`}
              >
                <AlertTriangle className="h-3 w-3" />
                {daysSince(job.updatedAt)}d
              </span>
            )}
            <FitnessRing score={job.fitnessScore} />
          </div>
        </div>

        {(job.applicationType || job.industry || job.workModel || (job.status === "rejected" && job.rejectionTag)) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {job.status === "rejected" && job.rejectionTag && (
              <Badge variant="outline" className="text-[10px] font-medium bg-destructive/10 text-destructive border-destructive/30">
                {job.rejectionTag}
              </Badge>
            )}
            {job.workModel && (
              <Badge variant="outline" className={cn("text-[10px] font-medium", WORK_MODEL_STYLES[job.workModel])}>
                {job.workModel}
              </Badge>
            )}
            {job.applicationType && (
              <Badge variant="secondary" className="text-[10px] font-normal">{job.applicationType}</Badge>
            )}
            {job.industry && (
              <Badge variant="outline" className="text-[10px] font-normal">{job.industry}</Badge>
            )}
          </div>
        )}

        {job.location && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {job.location}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground gap-2">
          <span className="truncate">
            {job.dateApplied ? `Applied ${formatDate(job.dateApplied)}` : "—"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 hover:text-foreground"
              >
                Link <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {onArchive && (
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                className="inline-flex items-center gap-0.5 rounded p-0.5 hover:text-foreground hover:bg-background/40 opacity-60 hover:opacity-100 transition"
                aria-label="Archive job"
                title="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
