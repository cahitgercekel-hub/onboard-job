import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, ExternalLink, MapPin, Files, Trash2, Briefcase, Check } from "lucide-react";
import { alarmFor, daysSince } from "@/lib/jobsStore";
import type { Job, WorkModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { usePrefs } from "@/lib/preferences";
import { FitnessRing } from "@/components/FitnessRing";
import { useCvVersions } from "@/lib/cvVersionsStore";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  job: Job;
  onClick: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  overlay?: boolean;
}

const WORK_MODEL_STYLES: Record<WorkModel, string> = {
  Remote: "bg-success/10 text-success border-success/30",
  Hybrid: "bg-accent/10 text-accent border-accent/30",
  "On-site": "bg-muted text-foreground/80 border-border",
};

/* ------------------------------- JobCard --------------------------------- */

export function JobCard({ job, onClick, onArchive: _onArchive, onDelete, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  const { formatDate } = usePrefs();
  const { versions } = useCvVersions();
  const { t } = useTranslation();
  const cvVersionName = job.cvVersionId ? versions.find((v) => v.id === job.cvVersionId)?.name : null;
  const alarm = alarmFor(job);
  const style = overlay ? undefined : { opacity: isDragging ? 0 : 1 };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    const target = e.target as HTMLElement;
    if (target.closest("a,button")) return;
    onClick();
  };

  const statusLabel = (() => {
    if (job.dateApplied) return t("tracker.appliedAt", { date: formatDate(job.dateApplied) });
    if (job.status === "saved") return t("tracker.status.saved");
    if (job.status === "interviewing") return t("tracker.status.interviewing");
    if (job.status === "offer") return t("tracker.status.offer");
    if (job.status === "rejected") return t("tracker.status.rejected");
    return "—";
  })();

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={handleClick}
      className={cn(
        "group surface-card p-3 transition-shadow hover:shadow-md select-none",
        "touch-pan-x md:touch-none",
        overlay ? "cursor-grabbing" : "cursor-pointer md:cursor-grab md:active:cursor-grabbing",
        alarm === "warn" && "ring-1 ring-warning/50",
        alarm === "danger" && "ring-1 ring-destructive/60",
        overlay && "shadow-lg ring-1 ring-accent/40"
      )}
    >
      {/* Top: logo + title + match ring */}
      {/* Title uses the full card width (up to 2 lines); logo, company and score share the row below. */}
      <div className="text-sm font-semibold text-foreground leading-snug line-clamp-2 break-words" title={job.role}>{job.role}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <CompanyLogo company={job.company} url={job.url} size={24} />
        <div className="min-w-0 flex-1 text-xs font-medium text-foreground/80 leading-snug break-words">{job.company}</div>
        {(job.fitnessScore ?? null) !== null && (
          <div className="shrink-0" title={t("ux.job.matchScore")}>
            <FitnessRing score={job.fitnessScore} variant="sm" />
          </div>
        )}
      </div>

      {/* Tag pills */}
      {(job.applicationType || job.industry || job.workModel || cvVersionName || (job.status === "rejected" && job.rejectionTag)) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.status === "rejected" && job.rejectionTag && (
            <Badge variant="outline" className="text-[10px] font-medium rounded-full bg-destructive/10 text-destructive border-destructive/30">
              {job.rejectionTag}
            </Badge>
          )}
          {cvVersionName && (
            <Badge variant="outline" className="text-[10px] font-medium rounded-full bg-amber-100 text-amber-800 border-amber-200 inline-flex items-center gap-1">
              <Files className="h-2.5 w-2.5" /> {cvVersionName}
            </Badge>
          )}
          {job.workModel && (
            <Badge variant="outline" className={cn("text-[10px] font-medium rounded-full", WORK_MODEL_STYLES[job.workModel])}>
              {job.workModel}
            </Badge>
          )}
          {job.applicationType && (
            <Badge variant="outline" className="text-[10px] font-normal rounded-full bg-muted/60 text-foreground/80 border-border">
              {job.applicationType}
            </Badge>
          )}
          {job.industry && (
            <Badge variant="outline" className="text-[10px] font-normal rounded-full bg-muted/60 text-foreground/80 border-border">
              {job.industry}
            </Badge>
          )}
        </div>
      )}

      {/* Location + stale alarm */}
      {(job.location || alarm !== "none") && (
        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
          {job.location && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate max-w-[180px]">{job.location}</span>
                </TooltipTrigger>
                <TooltipContent>{job.location}</TooltipContent>
              </Tooltip>
            </span>
          )}
          {alarm !== "none" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                alarm === "warn" ? "text-warning-foreground/90" : "text-destructive"
              )}
              title={t("tracker.ghostingTitle", { company: job.company })}
            >
              <AlertTriangle className="h-3 w-3" />
              {daysSince(job.updatedAt)}d
            </span>
          )}
        </div>
      )}

      {/* Footer: divider + status + actions */}
      <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 text-success font-medium min-w-0">
          {job.dateApplied ? <Check className="h-3 w-3 shrink-0" /> : null}
          <span className={cn("whitespace-nowrap", !job.dateApplied && "text-muted-foreground font-normal")}>{statusLabel}</span>
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {job.url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    window.open(job.url, "_blank", "noopener,noreferrer");
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-accent hover:bg-accent/10 transition-colors"
                  aria-label={t("ux.card.openLink")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>{t("ux.card.openLink")}</TooltipContent>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label={t("ux.card.deleteJob")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("ux.card.deleteJob")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
