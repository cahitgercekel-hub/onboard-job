import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { AlertTriangle, ExternalLink, GripVertical } from "lucide-react";
import { alarmFor, daysSince } from "@/lib/jobsStore";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  job: Job;
  onClick: () => void;
  overlay?: boolean;
}

export function JobCard({ job, onClick, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  const alarm = alarmFor(job);

  // When overlay=true we render inside DragOverlay (no transform, full opacity, lifted shadow).
  const style = overlay
    ? undefined
    : { opacity: isDragging ? 0 : 1 };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group surface-card p-3 cursor-pointer transition-shadow hover:shadow-md",
        alarm === "warn" && "ring-1 ring-warning/50",
        alarm === "danger" && "ring-1 ring-destructive/60",
        overlay && "shadow-lg ring-1 ring-accent/40 cursor-grabbing"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing"
          aria-label="Drag"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-foreground truncate">{job.role}</div>
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
          </div>
          <div className="text-xs text-muted-foreground truncate">{job.company}</div>

          {(job.applicationType || job.industry) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {job.applicationType && (
                <Badge variant="secondary" className="text-[10px] font-normal">{job.applicationType}</Badge>
              )}
              {job.industry && (
                <Badge variant="outline" className="text-[10px] font-normal">{job.industry}</Badge>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {job.dateApplied ? `Applied ${format(new Date(job.dateApplied), "MMM d")}` : "—"}
            </span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
