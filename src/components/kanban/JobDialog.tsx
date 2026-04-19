import { useState } from "react";
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
  type ApplicationType,
  type Industry,
  type Job,
  type JobStatus,
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
  const [company, setCompany] = useState(job?.company ?? "");
  const [role, setRole] = useState(job?.role ?? "");
  const [url, setUrl] = useState(job?.url ?? "");
  const [dateApplied, setDateApplied] = useState(job?.dateApplied?.slice(0, 10) ?? "");
  const [status, setStatus] = useState<JobStatus>(job?.status ?? initialStatus);
  const [appType, setAppType] = useState<ApplicationType | "">((job?.applicationType as ApplicationType) ?? "");
  const [industry, setIndustry] = useState<Industry | "">((job?.industry as Industry) ?? "");
  const [notes, setNotes] = useState(job?.notes ?? "");

  // reset when reopened with new job
  // (simple guard: when dialog closes, parent will unmount via key)
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
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{job ? "Edit job" : "Add job"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Product Manager" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="url">Job URL</Label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="date">Date applied</Label>
              <Input id="date" type="date" value={dateApplied} onChange={(e) => setDateApplied(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
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
              <Label>Application type</Label>
              <Select value={appType} onValueChange={(v) => setAppType(v as ApplicationType)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={(v) => setIndustry(v as Industry)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {job && onDelete && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { onDelete(); onOpenChange(false); }}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit}>{job ? "Save" : "Add job"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
