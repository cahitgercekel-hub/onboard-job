import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  onSave: (data: Omit<Job, "id" | "createdAt" | "updatedAt">) => void;
  onDelete?: () => void;
}

export function JobDialog({ open, onOpenChange, initialStatus = "saved", job, onSave, onDelete }: Props) {
  const { t } = useTranslation();
  const [company, setCompany] = useState(job?.company ?? "");
  const [role, setRole] = useState(job?.role ?? "");
  const [url, setUrl] = useState(job?.url ?? "");
  const [dateApplied, setDateApplied] = useState(job?.dateApplied?.slice(0, 10) ?? "");
  const [status, setStatus] = useState<JobStatus>(job?.status ?? initialStatus);
  const [appType, setAppType] = useState<ApplicationType | "">((job?.applicationType as ApplicationType) ?? "");
  const [industry, setIndustry] = useState<Industry | "">((job?.industry as Industry) ?? "");
  const [workModel, setWorkModel] = useState<WorkModel | "">((job?.workModel as WorkModel) ?? "");
  const [location, setLocation] = useState(job?.location ?? "");
  const [jobDescription, setJobDescription] = useState(job?.jobDescription ?? "");
  const [notes, setNotes] = useState(job?.notes ?? "");

  useEffect(() => {
    if (!open) return;
    setCompany(job?.company ?? "");
    setRole(job?.role ?? "");
    setUrl(job?.url ?? "");
    setDateApplied(job?.dateApplied?.slice(0, 10) ?? "");
    setStatus(job?.status ?? initialStatus);
    setAppType((job?.applicationType as ApplicationType) ?? "");
    setIndustry((job?.industry as Industry) ?? "");
    setWorkModel((job?.workModel as WorkModel) ?? "");
    setLocation(job?.location ?? "");
    setJobDescription(job?.jobDescription ?? "");
    setNotes(job?.notes ?? "");
  }, [open, job, initialStatus]);

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
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? t("common.edit") : t("common.add")}</DialogTitle>
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
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
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
            <Label htmlFor="jd">{t("common.jobDescription")}</Label>
            <Textarea id="jd" rows={4} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the JD here — used for AI Interview Prep…" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">{t("common.notes")}</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {job && onDelete && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { onDelete(); onOpenChange(false); }}>
                {t("common.delete")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit}>{job ? t("common.save") : t("common.add")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
