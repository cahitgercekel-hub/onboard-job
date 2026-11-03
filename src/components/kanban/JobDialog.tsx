import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2, Mail, CalendarIcon, ExternalLink, MoreHorizontal, Trash2, Archive, X } from "lucide-react";
import { format as fmtDate, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { usePrefs } from "@/lib/preferences";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/lib/db";
import { useAiAccess } from "@/lib/aiAccess";
import { isDemo } from "@/lib/demo/demoMode";
import { demoDelay, demoFitness } from "@/lib/demo/demo-examples";
import { DemoExampleLabel } from "@/components/shared/demo-bits";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FitnessRing } from "@/components/FitnessRing";
import { CoverLetterStudio } from "@/components/kanban/CoverLetterStudio";
import { LocationCombobox } from "@/components/kanban/location-combobox";
import { useCvVersions } from "@/lib/cvVersionsStore";
import { CompanyLogo } from "@/components/CompanyLogo";
import { toast } from "sonner";
import {
  APPLICATION_TYPES,
  INDUSTRIES,
  STATUS_ORDER,
  WORK_MODELS,
  type ApplicationType,
  type Industry,
  type Job,
  type JobStatus,
  type WorkModel,
} from "@/lib/types";

export type JobFormData = Omit<Job, "id" | "createdAt" | "updatedAt">;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialStatus?: JobStatus;
  job?: Job;
  /** Prefilled values for a new, unsaved job (e.g. from Auto-add). Nothing is created until the panel closes. */
  draft?: Partial<JobFormData>;
  /** Called on close when there is something to save (edit: changed; add: company or role filled). */
  onSave: (data: JobFormData) => void;
  onDelete?: () => void;
  onArchive?: () => void;
}

const STATUS_DOT: Record<JobStatus, string> = {
  saved: "bg-column-saved",
  applied: "bg-column-applied",
  interviewing: "bg-column-interviewing",
  offer: "bg-column-offer",
  rejected: "bg-column-rejected",
  archived: "bg-muted-foreground",
};

const STATUS_TINT: Record<JobStatus, string> = {
  saved: "bg-column-saved/10 border-column-saved/40",
  applied: "bg-column-applied/10 border-column-applied/40",
  interviewing: "bg-column-interviewing/10 border-column-interviewing/40",
  offer: "bg-column-offer/10 border-column-offer/40",
  rejected: "bg-column-rejected/10 border-column-rejected/40",
  archived: "bg-muted border-border",
};

function StatusDot({ status }: { status: JobStatus }) {
  return <span aria-hidden className={cn("inline-block h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status])} />;
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

interface FormValues {
  company: string;
  role: string;
  url: string;
  dateApplied: string;
  status: JobStatus;
  appType: ApplicationType | "";
  industry: Industry | "";
  workModel: WorkModel | "";
  location: string;
  jobDescription: string;
  notes: string;
  cvVersionId: string;
}

function initialValues(src: Partial<JobFormData> | undefined, initialStatus: JobStatus): FormValues {
  return {
    company: src?.company ?? "",
    role: src?.role ?? "",
    url: src?.url ?? "",
    dateApplied: src?.dateApplied?.slice(0, 10) ?? "",
    status: src?.status ?? initialStatus,
    appType: (src?.applicationType as ApplicationType) ?? "",
    industry: (src?.industry as Industry) ?? "",
    workModel: (src?.workModel as WorkModel) ?? "",
    location: src?.location ?? "",
    jobDescription: src?.jobDescription ?? "",
    notes: src?.notes ?? "",
    cvVersionId: src?.cvVersionId ?? "",
  };
}

function trimmed(v: FormValues): FormValues {
  return { ...v, company: v.company.trim(), role: v.role.trim(), url: v.url.trim(), location: v.location.trim(), jobDescription: v.jobDescription.trim(), notes: v.notes.trim() };
}

export function JobDialog({ open, onOpenChange, initialStatus = "saved", job, draft, onSave, onDelete, onArchive }: Props) {
  const { t } = useTranslation();
  const { versions } = useCvVersions();
  const { requestAi } = useAiAccess();
  const { formatDate } = usePrefs();
  const initial = useMemo(() => initialValues(job ?? draft, initialStatus), [job, draft, initialStatus]);
  const [v, setV] = useState<FormValues>(initial);
  const set = <K extends keyof FormValues>(k: K, val: FormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const [companyError, setCompanyError] = useState(false);
  const [dateHint, setDateHint] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const companyRef = useRef<HTMLInputElement>(null);
  const [scoring, setScoring] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [demoFit, setDemoFit] = useState<{ score: number; reasoning: string } | null>(null);
  const fitScore = demoFit?.score ?? job?.fitnessScore;
  const fitReasoning = demoFit?.reasoning ?? job?.fitnessReasoning;

  const dirty = JSON.stringify(trimmed(v)) !== JSON.stringify(trimmed(initial));
  const urlInvalid = v.url.trim() !== "" && !isValidUrl(v.url);

  const changeStatus = (s: JobStatus) => {
    if (v.status === "saved" && s !== "saved" && !v.dateApplied) {
      setV((p) => ({ ...p, status: s, dateApplied: fmtDate(new Date(), "yyyy-MM-dd") }));
      setDateHint(true);
    } else {
      set("status", s);
    }
  };

  const calculateFitness = async () => {
    if (!job?.id) return;
    if (!v.jobDescription.trim()) return toast.error("Add a job description first.");
    if (!(await requestAi("fitness"))) return;
    setScoring(true);
    try {
      if (isDemo()) {
        await demoDelay();
        const ex = demoFitness(job.company, job.role);
        const { error } = await supabase.from("jobs").update({ fitness_score: ex.score, fitness_reasoning: ex.reasoning }).eq("id", job.id);
        if (error) throw error;
        setDemoFit(ex);
        toast.success(`${t("ux.demo.exampleLabel")}: ${t("ux.job.matchScore")} ${ex.score}`);
        return;
      }
      const { data, error } = await supabase.functions.invoke("calculate-fitness", { body: { jobId: job.id } });
      if (error) throw error;
      const res: unknown = data;
      if (res && typeof res === "object" && "error" in res && typeof res.error === "string") throw new Error(res.error);
      const score = res && typeof res === "object" && "score" in res ? String(res.score) : "";
      toast.success(`Fitness score: ${score}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't score this job");
    } finally {
      setScoring(false);
    }
  };

  const toData = (): JobFormData => {
    const x = trimmed(v);
    return {
      company: x.company,
      role: x.role,
      url: x.url || undefined,
      dateApplied: x.dateApplied ? new Date(x.dateApplied).toISOString() : undefined,
      status: x.status,
      applicationType: x.appType || undefined,
      industry: x.industry || undefined,
      workModel: x.workModel || undefined,
      location: x.location || undefined,
      jobDescription: x.jobDescription || undefined,
      notes: x.notes || undefined,
      cvVersionId: x.cvVersionId || null,
    };
  };

  /** Close with autosave. Returns without closing when validation fails. */
  const requestClose = () => {
    if (job) {
      if (!v.company.trim()) {
        setCompanyError(true);
        requestAnimationFrame(() => companyRef.current?.focus());
        return;
      }
      if (dirty) onSave(toData());
    } else if (v.company.trim() || v.role.trim()) {
      onSave(toData());
    }
    onOpenChange(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      requestClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) requestClose(); }}>
      <SheetContent
        side="right"
        hideClose
        overlayClassName="bg-foreground/20"
        className="w-full max-w-[100vw] sm:w-[600px] sm:max-w-[600px] h-full flex flex-col gap-0 p-0 overflow-hidden"
        onKeyDown={onKeyDown}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <SheetHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0 space-y-0">
          <div className="flex items-center gap-3">
            <CompanyLogo company={v.company} url={v.url} size={32} />
            <div className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle>{job ? t("ux.job.editTitle") : t("ux.job.addTitle")}</SheetTitle>
                <button
                  type="button"
                  onClick={() => setStatusOpen(true)}
                  aria-label={t("ux.job.changeStatus")}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium text-foreground transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", STATUS_TINT[v.status])}
                >
                  <StatusDot status={v.status} />
                  {t(`tracker.status.${v.status}`)}
                </button>
                {dirty && <span className="text-xs text-muted-foreground" aria-live="polite">{t("ux.job.unsaved")}</span>}
              </div>
              <SheetDescription className="truncate">{v.company || job?.company || t("ux.job.addTitle")}</SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {job && (onDelete || onArchive) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("ux.job.more")}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onArchive && (
                      <DropdownMenuItem onSelect={() => { onArchive(); onOpenChange(false); }}>
                        <Archive className="h-4 w-4 mr-2" /> {t("common.archive")}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(true)}>
                        <Trash2 className="h-4 w-4 mr-2" /> {t("common.delete")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.close")}>
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetHeader>

        <div className="grid content-start gap-4 px-6 py-5 overflow-y-auto min-h-0 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5 content-start">
              <Label htmlFor="company">{t("common.company")}</Label>
              <Input
                id="company"
                ref={companyRef}
                value={v.company}
                aria-invalid={companyError && !v.company.trim()}
                aria-describedby={companyError ? "company-error" : undefined}
                onChange={(e) => { set("company", e.target.value); if (e.target.value.trim()) setCompanyError(false); }}
                placeholder="Acme Inc."
                className={cn(companyError && !v.company.trim() && "border-destructive")}
              />
              {companyError && !v.company.trim() && (
                <p id="company-error" className="text-xs text-destructive">{t("ux.job.companyRequired")}</p>
              )}
            </div>
            <div className="grid gap-1.5 content-start">
              <Label htmlFor="role">{t("common.role")}</Label>
              <Input id="role" value={v.role} onChange={(e) => set("role", e.target.value)} placeholder="Product Manager" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5 content-start">
              <Label htmlFor="status">{t("common.status")}</Label>
              <Select value={v.status} onValueChange={(s) => changeStatus(s as JobStatus)} open={statusOpen} onOpenChange={setStatusOpen}>
                <SelectTrigger id="status" className={cn(STATUS_TINT[v.status])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <StatusDot status={s} />
                        {t(`tracker.status.${s}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {v.status !== "saved" && (
              <div className="grid gap-1.5 content-start">
                <Label htmlFor="date">{t("common.date")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      type="button"
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !v.dateApplied && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {v.dateApplied ? formatDate(v.dateApplied) : <span>{t("ux.job.pickDate")}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={v.dateApplied ? parseISO(v.dateApplied) : undefined}
                      defaultMonth={v.dateApplied ? parseISO(v.dateApplied) : undefined}
                      onSelect={(d) => { set("dateApplied", d ? fmtDate(d, "yyyy-MM-dd") : ""); setDateHint(false); }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {dateHint && <p className="text-xs text-muted-foreground">{t("ux.job.dateHint")}</p>}
              </div>
            )}
          </div>

          <SectionHeading>{t("ux.job.sectionDetails")}</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5 content-start">
              <Label>{t("common.applicationType")}</Label>
              <Select value={v.appType} onValueChange={(x) => set("appType", x as ApplicationType)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_TYPES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 content-start">
              <Label>{t("common.workModel")}</Label>
              <Select value={v.workModel} onValueChange={(x) => set("workModel", x as WorkModel)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {WORK_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5 content-start">
              <Label>{t("common.industry")}</Label>
              <Select value={v.industry} onValueChange={(x) => set("industry", x as Industry)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 content-start">
              <Label htmlFor="location">{t("common.location")}</Label>
              <LocationCombobox id="location" value={v.location} onChange={(x) => set("location", x)} />
            </div>
          </div>

          <SectionHeading>{t("ux.job.sectionApplication")}</SectionHeading>
          <div className="grid gap-1.5">
            <Label>{t("ux.job.cvVersionSent")}</Label>
            <Select value={v.cvVersionId || "__none__"} onValueChange={(x) => set("cvVersionId", x === "__none__" ? "" : x)}>
              <SelectTrigger>
                <SelectValue placeholder={versions.length === 0 ? t("tracker.noJobs") : t("common.any")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("common.any")}</SelectItem>
                {versions.map((cv) => <SelectItem key={cv.id} value={cv.id}>{cv.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="url">{t("common.url")}</Label>
            <div className="relative">
              <Input
                id="url"
                value={v.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://…"
                className={cn("pr-11", urlInvalid && "border-destructive")}
                aria-invalid={urlInvalid}
                aria-describedby={urlInvalid ? "url-error" : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                aria-label={t("ux.job.openLink")}
                title={t("ux.job.openLink")}
                disabled={!v.url.trim() || urlInvalid}
                onClick={() => window.open(v.url.trim(), "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            {urlInvalid && <p id="url-error" className="text-xs text-destructive">{t("ux.job.invalidUrl")}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <label htmlFor="jd">{t("ux.job.sectionJd")}</label>
            </h3>
            {job && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ai" size="sm" className="h-8 px-2.5 text-xs" disabled={scoring || !v.jobDescription.trim()} onClick={calculateFitness}>
                  {scoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {t("assistant.cv.analyze")}
                </Button>
                <Button type="button" variant="ai" size="sm" className="h-8 px-2.5 text-xs" onClick={() => setCoverOpen(true)}>
                  <Mail className="h-3.5 w-3.5" />
                  {t("ux.job.tailorCover")}
                </Button>
              </div>
            )}
          </div>
          <Textarea id="jd" rows={10} className="min-h-[200px]" value={v.jobDescription} onChange={(e) => set("jobDescription", e.target.value)} placeholder="Paste the JD here — used for AI Fitness Score & Interview Prep…" />
          {fitReasoning && (
            <div className="flex gap-3 rounded-md border border-border bg-muted/30 p-3">
              <FitnessRing score={fitScore} size={44} stroke={5} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t("ux.job.matchScore")}</span>
                  <DemoExampleLabel />
                </div>
                <p className="text-xs text-foreground leading-relaxed">{fitReasoning}</p>
              </div>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="notes">{t("common.notes")}</Label>
            <Textarea id="notes" rows={5} className="min-h-[120px]" value={v.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <SheetFooter className="gap-2 shrink-0 border-t border-border bg-background px-6 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pr-24">
          <Button variant="outline" disabled={!dirty} onClick={() => onOpenChange(false)}>{t("ux.job.discard")}</Button>
          <Button onClick={requestClose} title="Ctrl/⌘ + Enter">{t("ux.job.done")}</Button>
        </SheetFooter>
      </SheetContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ux.job.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("ux.job.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onDelete?.(); onOpenChange(false); }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {job && <CoverLetterStudio open={coverOpen} onOpenChange={setCoverOpen} job={job} />}
    </Sheet>
  );
}
