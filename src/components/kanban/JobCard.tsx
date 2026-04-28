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

/* ---------------- Company logo with multi-source fallback ---------------- */

const LOGO_CACHE = new Map<string, string>();

const COMPANY_SUFFIXES = /\b(group|holdings?|holding|gmbh|ag|kg|se|inc|incorporated|ltd|limited|llc|plc|co|company|corp|corporation|sa|nv|bv|oy|ab|spa|srl|germany|deutschland|usa|uk|europe|emea|emeia|international|global|labs|technologies|technology|tech|digital|studios?|solutions|services|partners?|ventures?)\b/gi;

function slugifyToDomain(company: string): string | null {
  // Cut at common separators that mark sub-brands or suffixes.
  let base = company.split(/[-–—|/(),]/)[0] || company;
  // Strip company-form suffixes ("Group", "GmbH", ...).
  base = base.replace(COMPANY_SUFFIXES, " ");
  // Take first significant token (>= 2 chars), fall back to whole cleaned string.
  const tokens = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
  if (tokens.length === 0) return null;
  // Single most-distinctive token works best for logo CDNs.
  const slug = tokens[0];
  if (!slug) return null;
  return `${slug}.com`;
}

function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function hashHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function CompanyLogo({ company, url, size = 28 }: { company: string; url?: string | null; size?: number }) {
  const domain = useMemo(() => domainFromUrl(url) || slugifyToDomain(company), [url, company]);
  const sources = useMemo(() => {
    if (!domain) return [] as string[];
    if (LOGO_CACHE.has(domain)) return [LOGO_CACHE.get(domain)!];
    return [
      `https://cdn.brandfetch.io/${domain}/w/80/h/80?c=1idV74_default`,
      `https://img.logo.dev/${domain}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&size=80`,
      `https://logo.clearbit.com/${domain}`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    ];
  }, [domain]);

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(sources.length === 0);

  const initial = (company || "?").trim().charAt(0).toUpperCase() || "?";
  const hue = hashHue(company || "x");
  const placeholderStyle = {
    width: size,
    height: size,
    background: `hsl(${hue} 70% 92%)`,
    color: `hsl(${hue} 60% 35%)`,
  };

  if (failed) {
    return (
      <div
        className="rounded-md border border-border flex items-center justify-center text-[11px] font-bold shrink-0"
        style={placeholderStyle}
        aria-label={`${company} logo`}
      >
        {initial === "?" ? <Briefcase className="h-3.5 w-3.5 opacity-70" /> : initial}
      </div>
    );
  }

  return (
    <img
      src={sources[idx]}
      alt={`${company} logo`}
      width={size}
      height={size}
      loading="lazy"
      className="rounded-md border border-border bg-white object-contain shrink-0"
      style={{ width: size, height: size }}
      onLoad={() => {
        if (domain) LOGO_CACHE.set(domain, sources[idx]);
      }}
      onError={() => {
        if (idx + 1 < sources.length) setIdx(idx + 1);
        else setFailed(true);
      }}
    />
  );
}

/* ------------------------------- JobCard --------------------------------- */

export function JobCard({ job, onClick, onArchive: _onArchive, onDelete, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  const { formatDate } = usePrefs();
  const { versions } = useCvVersions();
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
    if (job.dateApplied) return `Applied ${formatDate(job.dateApplied)}`;
    if (job.status === "saved") return "Saved";
    if (job.status === "interviewing") return "Interviewing";
    if (job.status === "offer") return "Offer";
    if (job.status === "rejected") return "Rejected";
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
      {/* Top: title + match ring (fixed-width slot keeps title width stable) */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{job.role}</div>
        </div>
        <div className="w-12 h-12 shrink-0 flex items-center justify-center" title="Match score">
          {(job.fitnessScore ?? null) !== null && (
            <FitnessRing score={job.fitnessScore} variant="lg" />
          )}
        </div>
      </div>

      {/* Company row */}
      <div className="mt-2 flex items-center gap-2 min-w-0">
        <CompanyLogo company={job.company} url={job.url} />
        <div className="text-xs font-medium text-foreground/90 truncate">{job.company}</div>
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
              <span className="truncate">
                {job.location}
                {alarm === "none" && job.updatedAt && job.status !== "saved" && ` — ${daysSince(job.updatedAt)}d ago`}
              </span>
            </span>
          )}
          {alarm !== "none" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                alarm === "warn" ? "text-warning-foreground/90" : "text-destructive"
              )}
              title={`No update for ${daysSince(job.updatedAt)} days`}
            >
              <AlertTriangle className="h-3 w-3" />
              {daysSince(job.updatedAt)}d
            </span>
          )}
        </div>
      )}

      {/* Footer: divider + status + actions */}
      <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 text-success font-medium truncate">
          {job.dateApplied ? <Check className="h-3 w-3 shrink-0" /> : null}
          <span className={cn("truncate", !job.dateApplied && "text-muted-foreground font-normal")}>{statusLabel}</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                window.open(job.url, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center gap-1 text-accent hover:text-accent/80 font-medium transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> Link
            </a>
          )}
          {onDelete && (
            <>
              {job.url && <span className="text-border">·</span>}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80 font-medium transition-colors"
                aria-label="Delete job"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
