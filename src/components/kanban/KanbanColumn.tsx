import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { Job, JobStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { JobCard } from "./JobCard";
import { cn } from "@/lib/utils";

const COLUMN_DOT: Record<JobStatus, string> = {
  saved: "bg-column-saved",
  applied: "bg-column-applied",
  interviewing: "bg-column-interviewing",
  offer: "bg-column-offer",
  rejected: "bg-column-rejected",
};

interface Props {
  status: JobStatus;
  jobs: Job[];
  onAdd: () => void;
  onCardClick: (job: Job) => void;
}

export function KanbanColumn({ status, jobs, onAdd, onCardClick }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/40 transition-colors",
        isOver && "bg-accent/10 border-accent/50"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", COLUMN_DOT[status])} />
          <span className="text-sm font-medium text-foreground">{STATUS_LABEL[status]}</span>
          <span className="text-xs text-muted-foreground">{jobs.length}</span>
        </div>
        <button
          onClick={onAdd}
          className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-secondary"
          aria-label={`Add to ${STATUS_LABEL[status]}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px]">
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} onClick={() => onCardClick(j)} />
        ))}
        {jobs.length === 0 && (
          <button
            onClick={onAdd}
            className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md py-6 hover:bg-secondary/50 transition"
          >
            + Add job
          </button>
        )}
      </div>
    </div>
  );
}
