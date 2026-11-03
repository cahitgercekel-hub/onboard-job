import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/db";
import { useAiAccess } from "@/lib/aiAccess";
import { isDemo } from "@/lib/demo/demoMode";
import { demoDelay, demoFitness } from "@/lib/demo/demo-examples";
import { DemoExampleLabel } from "@/components/shared/demo-bits";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FitnessRing } from "@/components/FitnessRing";
import { CoverLetterStudio } from "@/components/kanban/CoverLetterStudio";
import { useCvVersions } from "@/lib/cvVersionsStore";
import { CompanyLogo } from "@/components/CompanyLogo";
import { toast } from "sonner";
import {
  APPLICATION_TYPES,
  INDUSTRIES,
  STATUS_LABEL,
  STATUS_ORDER,
  WORK_MODELS,
  type ApplicationType,
  type Industry,
  type Job,
  type JobStatus,
  type WorkModel,
} from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialStatus?: JobStatus;
  job?: Job;
  /** Prefilled values for a new, unsaved job (e.g. from Auto-add). Nothing is created until Save. */
  draft?: Partial<Omit<Job, "id" | "createdAt" | "updatedAt">>;
  onSave: (data: Omit<Job, "id" | "createdAt" | "updatedAt">) => void;
  onDelete?: () => void;
  onArchive?: () => void;
}

export function JobDialog({ open, onOpenChange, initialStatus = "saved", job, draft, onSave, onDelete, onArchive }: Props) {
  const { t } = useTranslation();
  const { versions } = useCvVersions();
  const { requestAi } = useAiAccess();
  const src = job ?? draft;
  const [company, setCompany] = useState(src?.company ?? "");
  const [role, setRole] = useState(src?.role ?? "");
  const [url, setUrl] = useState(src?.url ?? "");
  const [dateApplied, setDateApplied] = useState(src?.dateApplied?.slice(0, 10) ?? "");
  const [status, setStatus] = useState<JobStatus>(src?.status ?? initialStatus);
  const [appType, setAppType] = useState<ApplicationType | "">((src?.applicationType as ApplicationType) ?? "");
  const [industry, setIndustry] = useState<Industry | "">((src?.industry as Industry) ?? "");
  const [workModel, setWorkModel] = useState<WorkModel | "">((src?.workModel as WorkModel) ?? "");
  const [location, setLocation] = useState(src?.location ?? "");
  const [jobDescription, setJobDescription] = useState(src?.jobDescription ?? "");
  const [notes, setNotes] = useState(src?.notes ?? "");
  const [cvVersionId, setCvVersionId] = useState<string>(src?.cvVersionId ?? "");
  const [scoring, setScoring] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [demoFit, setDemoFit] = useState<{ score: number; reasoning: string } | null>(null);
  const fitScore = demoFit?.score ?? job?.fitnessScore;
  const fitReasoning = demoFit?.reasoning ?? job?.fitnessReasoning;

  useEffect(() => {
    if (!open) return;
    setDemoFit(null);
    setCompany(src?.company ?? "");
    setRole(src?.role ?? "");
    setUrl(src?.url ?? "");
    setDateApplied(src?.dateApplied?.slice(0, 10) ?? "");
    setStatus(src?.status ?? initialStatus);
    setAppType((src?.applicationType as ApplicationType) ?? "");
    setIndustry((src?.industry as Industry) ?? "");
    setWorkModel((src?.workModel as WorkModel) ?? "");
    setLocation(src?.location ?? "");
    setJobDescription(src?.jobDescription ?? "");
    setNotes(src?.notes ?? "");
    setCvVersionId(src?.cvVersionId ?? "");
  }, [open, job, draft, initialStatus]);

  const calculateFitness = async () => {
    if (!job?.id) return toast.error("Save the job first, then calculate fitness.");
    if (!jobDescription.trim()) return toast.error("Add a job description first.");
    if (!(await requestAi("fitness"))) return;
    setScoring(true);
    try {
      if (isDemo()) {
        // Demo: pre-written example score, saved to the in-tab demo data only.
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
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Fitness score: ${(data as any).score}`);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't score this job");
    } finally {
      setScoring(false);
    }
  };

  const submit = () => {
    if (!company.trim() || !role.trim()) return;
    onSave({
      company: company.trim(),
      role: role.trim(),
      url: url.trim() || undefined,
      dateApplied: dateApplied ? new Date(dateApplied).toISOString() : undefined,
      status,
      applicationType: (appType || undefined) as ApplicationType | undefined,
      industry: (industry || undefined) as Industry | undefined,
      workModel: (workModel || undefined) as WorkModel | undefined,
      location: location.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
      notes: notes.trim() || undefined,
      cvVersionId: cvVersionId || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
        onOpenAutoFocus={(e) => {
          // Focus the dialog itself instead of selecting the Company field's text.
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <CompanyLogo company={company} url={url} size={32} />
            <div className="min-w-0 text-left">
              <DialogTitle>{job ? t("ux.job.editTitle") : t("common.add")}</DialogTitle>
              {job ? (
                <DialogDescription className="truncate">{job.company}</DialogDescription>
              ) : (
                <DialogDescription className="sr-only">{t("common.add")}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="company">{t("common.company")}</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role">{t("common.role")}</Label>
              <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Product Manager" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="url">{t("common.url")}</Label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="date">{t("common.date")}</Label>
              <Input id="date" type="date" value={dateApplied} onChange={(e) => setDateApplied(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.status")}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{t(`tracker.status.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("common.applicationType")}</Label>
              <Select value={appType} onValueChange={(v) => setAppType(v as ApplicationType)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.industry")}</Label>
              <Select value={industry} onValueChange={(v) => setIndustry(v as Industry)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("common.workModel")}</Label>
              <Select value={workModel} onValueChange={(v) => setWorkModel(v as WorkModel)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {WORK_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="location">{t("common.location")}</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Berlin, DE" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("ux.job.cvVersionSent")}</Label>
            <Select
              value={cvVersionId || "__none__"}
              onValueChange={(v) => setCvVersionId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={versions.length === 0 ? t("tracker.noJobs") : t("common.any")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("common.any")}</SelectItem>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="jd">{t("common.jobDescription")}</Label>
              {job && (
                <Button type="button" variant="outline" size="sm" disabled={scoring || !jobDescription.trim()} onClick={calculateFitness}>
                  {scoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {job.fitnessScore != null ? t("assistant.cv.analyze") : t("assistant.cv.analyze")}
                </Button>
              )}
            </div>
            <Textarea id="jd" rows={4} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the JD here — used for AI Fitness Score & Interview Prep…" />
            {fitReasoning && (
              <div className="mt-2 flex gap-3 rounded-md border border-border bg-muted/30 p-3">
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
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">{t("common.notes")}</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-1">
            {job && onDelete && (
              <Button variant="ghost" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { onDelete(); onOpenChange(false); }}>
                {t("common.delete")}
              </Button>
            )}
            {job && onArchive && (
              <Button variant="ghost" onClick={onArchive}>
                {t("common.archive")}
              </Button>
            )}
            {job && (
              <Button variant="ghost" onClick={() => setCoverOpen(true)}>
                <Mail className="h-3.5 w-3.5" /> {t("assistant.tabs.tone")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit}>{job ? t("common.save") : t("common.add")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
      {job && <CoverLetterStudio open={coverOpen} onOpenChange={setCoverOpen} job={job} />}
    </Dialog>
  );
}
