import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Job, JobStatus, ApplicationType, Industry, WorkModel, ArchiveType } from "./types";
import { STATUS_ORDER, APPLICATION_TYPES, INDUSTRIES, WORK_MODELS } from "./types";
import { toast } from "sonner";

const LEGACY_KEY = "jat.jobs.v1";
const MIGRATED_FLAG = "jat.migrated.v1";

// ----- Row <-> Job mapping -----
type JobRow = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  url: string | null;
  date_applied: string | null;
  status: JobStatus;
  application_type: string | null;
  industry: string | null;
  work_model: string | null;
  location: string | null;
  job_description: string | null;
  notes: string | null;
  fitness_score: number | null;
  fitness_reasoning: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  archive_type: string | null;
  rejection_reason: string | null;
  rejection_tag: string | null;
  archived_at: string | null;
  rejected_at: string | null;
  previous_status: JobStatus | null;
  cv_version_id: string | null;
};

function rowToJob(r: JobRow): Job {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    url: r.url ?? undefined,
    dateApplied: r.date_applied ?? undefined,
    status: r.status,
    applicationType: (r.application_type as ApplicationType | null) ?? undefined,
    industry: (r.industry as Industry | null) ?? undefined,
    workModel: (r.work_model as WorkModel | null) ?? undefined,
    location: r.location ?? undefined,
    jobDescription: r.job_description ?? undefined,
    notes: r.notes ?? undefined,
    fitnessScore: r.fitness_score,
    fitnessReasoning: r.fitness_reasoning,
    archiveType: (r.archive_type as ArchiveType | null) ?? null,
    rejectionReason: r.rejection_reason ?? null,
    rejectionTag: r.rejection_tag ?? null,
    archivedAt: r.archived_at ?? null,
    previousStatus: r.previous_status ?? null,
    cvVersionId: r.cv_version_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function jobToInsert(j: Omit<Job, "id" | "createdAt" | "updatedAt">, userId: string, source = "manual") {
  return {
    user_id: userId,
    company: j.company,
    role: j.role,
    url: j.url ?? null,
    date_applied: j.dateApplied ?? null,
    status: j.status,
    application_type: j.applicationType ?? null,
    industry: j.industry ?? null,
    work_model: j.workModel ?? null,
    location: j.location ?? null,
    job_description: j.jobDescription ?? null,
    notes: j.notes ?? null,
    cv_version_id: j.cvVersionId ?? null,
    source,
  };
}

function patchToUpdate(p: Partial<Job>) {
  const out: Record<string, unknown> = {};
  if (p.company !== undefined) out.company = p.company;
  if (p.role !== undefined) out.role = p.role;
  if (p.url !== undefined) out.url = p.url ?? null;
  if (p.dateApplied !== undefined) out.date_applied = p.dateApplied ?? null;
  if (p.status !== undefined) out.status = p.status;
  if (p.applicationType !== undefined) out.application_type = p.applicationType ?? null;
  if (p.industry !== undefined) out.industry = p.industry ?? null;
  if (p.workModel !== undefined) out.work_model = p.workModel ?? null;
  if (p.location !== undefined) out.location = p.location ?? null;
  if (p.jobDescription !== undefined) out.job_description = p.jobDescription ?? null;
  if (p.notes !== undefined) out.notes = p.notes ?? null;
  if (p.rejectionTag !== undefined) out.rejection_tag = p.rejectionTag ?? null;
  if (p.rejectionReason !== undefined) out.rejection_reason = p.rejectionReason ?? null;
  if (p.cvVersionId !== undefined) out.cv_version_id = p.cvVersionId ?? null;
  return out;
}

// ----- Legacy local store (still used by CSV preview) -----
function readLocal(): Job[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    return [];
  }
}

// ----- Auto-migrate legacy localStorage jobs on first login -----
async function migrateLegacyIfNeeded(userId: string) {
  if (localStorage.getItem(`${MIGRATED_FLAG}.${userId}`)) return;
  const local = readLocal();
  if (local.length === 0) {
    localStorage.setItem(`${MIGRATED_FLAG}.${userId}`, "1");
    return;
  }
  const inserts = local.map((j) => jobToInsert(j, userId, "migrated"));
  const { error } = await supabase.from("jobs").insert(inserts);
  if (error) {
    console.error("Legacy migration failed:", error);
    toast.error("Couldn't import your local jobs — see console.");
    return;
  }
  localStorage.removeItem(LEGACY_KEY);
  localStorage.setItem(`${MIGRATED_FLAG}.${userId}`, "1");
  toast.success(`Imported ${local.length} job${local.length === 1 ? "" : "s"} from your browser.`);
}

// ----- CSV export / import (kept) -----
function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = String(value).replace(/\r?\n/g, " ").trim();
  if (/[",;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportJobsAsCsv(): Promise<string> {
  const headers = [
    "Company", "Role", "Status", "Application Type", "Industry",
    "Work Model", "Location", "Date Applied", "URL", "Notes", "Job Description",
  ];
  const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const jobs = (data as JobRow[]).map(rowToJob);
  const rows = jobs.map((j) => [
    j.company, j.role, j.status, j.applicationType ?? "", j.industry ?? "",
    j.workModel ?? "", j.location ?? "", j.dateApplied ?? "", j.url ?? "",
    j.notes ?? "", j.jobDescription ?? "",
  ]);
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

export async function downloadJobsCsv() {
  const csv = await exportJobsAsCsv();
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jobby-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function clearAllJobs(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("jobs").delete().eq("user_id", user.id);
  if (error) throw error;
}

export interface ParsedImportRow {
  job: Omit<Job, "id" | "createdAt" | "updatedAt">;
  rowNumber: number;
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  rows: ParsedImportRow[];
  validCount: number;
  invalidCount: number;
  headerErrors: string[];
}

const EXPECTED_HEADERS = [
  "Company", "Role", "Status", "Application Type", "Industry",
  "Work Model", "Location", "Date Applied", "URL", "Notes", "Job Description",
];

function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && t[i + 1] === "\n") i++;
        row.push(cell); rows.push(row);
        row = []; cell = "";
      } else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v && v.trim().length > 0));
}

function normStatus(v: string): JobStatus | null {
  const s = v.trim().toLowerCase();
  return (STATUS_ORDER as string[]).includes(s) ? (s as JobStatus) : null;
}
function matchEnum<T extends string>(v: string, allowed: readonly T[]): T | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  return allowed.find((a) => a.toLowerCase() === s);
}

export function previewCsvImport(text: string): ImportPreview {
  const matrix = parseCsv(text);
  if (matrix.length === 0) {
    return { rows: [], validCount: 0, invalidCount: 0, headerErrors: ["CSV is empty."] };
  }
  const header = matrix[0].map((h) => h.trim());
  const headerErrors: string[] = [];
  const idx: Record<string, number> = {};
  for (const expected of EXPECTED_HEADERS) {
    const i = header.findIndex((h) => h.toLowerCase() === expected.toLowerCase());
    if (i === -1) headerErrors.push(`Missing column: ${expected}`);
    idx[expected] = i;
  }
  if (headerErrors.length > 0) {
    return { rows: [], validCount: 0, invalidCount: 0, headerErrors };
  }
  const rows: ParsedImportRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const cols = matrix[r];
    const get = (k: string) => (cols[idx[k]] ?? "").trim();
    const errors: string[] = [];
    const warnings: string[] = [];
    const company = get("Company");
    const role = get("Role");
    if (!company) errors.push("Company is required");
    if (!role) errors.push("Role is required");
    const rawStatus = get("Status");
    const status = normStatus(rawStatus) ?? "saved";
    if (rawStatus && !normStatus(rawStatus)) warnings.push(`Unknown status "${rawStatus}" → saved`);
    const appType = matchEnum<ApplicationType>(get("Application Type"), APPLICATION_TYPES);
    if (get("Application Type") && !appType) warnings.push(`Unknown application type "${get("Application Type")}"`);
    const industry = matchEnum<Industry>(get("Industry"), INDUSTRIES);
    if (get("Industry") && !industry) warnings.push(`Unknown industry "${get("Industry")}"`);
    const workModel = matchEnum<WorkModel>(get("Work Model"), WORK_MODELS);
    if (get("Work Model") && !workModel) warnings.push(`Unknown work model "${get("Work Model")}"`);
    const dateRaw = get("Date Applied");
    let dateApplied: string | undefined;
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (isNaN(d.getTime())) warnings.push(`Invalid date "${dateRaw}" ignored`);
      else dateApplied = d.toISOString();
    }
    rows.push({
      rowNumber: r + 1,
      errors, warnings,
      job: {
        company, role, status,
        applicationType: appType,
        industry, workModel,
        location: get("Location") || undefined,
        dateApplied,
        url: get("URL") || undefined,
        notes: get("Notes") || undefined,
        jobDescription: get("Job Description") || undefined,
      },
    });
  }
  const validCount = rows.filter((r) => r.errors.length === 0).length;
  return { rows, validCount, invalidCount: rows.length - validCount, headerErrors: [] };
}

export async function importJobs(rows: ParsedImportRow[]): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const valid = rows.filter((r) => r.errors.length === 0);
  if (valid.length === 0) return 0;
  const inserts = valid.map((r) => jobToInsert(r.job, user.id, "csv-import"));
  const { error } = await supabase.from("jobs").insert(inserts);
  if (error) throw error;
  return valid.length;
}

// ----- Hook -----
export function useJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const userIdRef = useRef<string | null>(null);

  const reload = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setJobs((data as JobRow[]).map(rowToJob));
  }, []);

  useEffect(() => {
    if (!user) {
      setJobs([]);
      userIdRef.current = null;
      return;
    }
    userIdRef.current = user.id;

    (async () => {
      await migrateLegacyIfNeeded(user.id);
      await reload(user.id);
    })();

    const channel = supabase
      .channel(`jobs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const j = rowToJob(payload.new as JobRow);
            setJobs((prev) => (prev.some((x) => x.id === j.id) ? prev : [j, ...prev]));
            if ((payload.new as JobRow).source === "extension") {
              toast.success("New job captured from browser extension!");
            }
          } else if (payload.eventType === "UPDATE") {
            const j = rowToJob(payload.new as JobRow);
            setJobs((prev) => prev.map((x) => (x.id === j.id ? j : x)));
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setJobs((prev) => prev.filter((x) => x.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, reload]);

  const addJob = useCallback(async (data: Omit<Job, "id" | "createdAt" | "updatedAt">): Promise<Job | null> => {
    const uid = userIdRef.current;
    if (!uid) return null;
    const { data: row, error } = await supabase
      .from("jobs")
      .insert(jobToInsert(data, uid))
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    const j = rowToJob(row as JobRow);
    setJobs((prev) => (prev.some((x) => x.id === j.id) ? prev : [j, ...prev]));
    return j;
  }, []);

  const updateJob = useCallback(async (id: string, patch: Partial<Job>) => {
    const { error } = await supabase.from("jobs").update(patchToUpdate(patch) as any).eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const removeJob = useCallback(async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const moveJob = useCallback(async (id: string, status: JobStatus) => {
    const patch: Record<string, unknown> = { status };
    // When leaving the Rejected column, wipe rejection metadata
    if (status !== "rejected") {
      patch.rejection_tag = null;
      patch.rejection_reason = null;
    }
    const { error } = await supabase.from("jobs").update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const setRejection = useCallback(async (id: string, tag: string, reason?: string) => {
    const { error } = await supabase
      .from("jobs")
      .update({
        status: "rejected",
        rejection_tag: tag,
        rejection_reason: reason ?? null,
      } as any)
      .eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const archiveJob = useCallback(async (
    id: string,
    archiveType: ArchiveType,
    opts?: { rejectionTag?: string; rejectionReason?: string },
  ) => {
    const current = jobs.find((j) => j.id === id);
    const previous = current?.status ?? null;
    const { error } = await supabase
      .from("jobs")
      .update({
        status: "archived",
        archive_type: archiveType,
        rejection_tag: opts?.rejectionTag ?? null,
        rejection_reason: opts?.rejectionReason ?? null,
        archived_at: new Date().toISOString(),
        previous_status: previous && previous !== "archived" ? previous : null,
      } as any)
      .eq("id", id);
    if (error) toast.error(error.message);
  }, [jobs]);

  const unarchiveJob = useCallback(async (id: string) => {
    const current = jobs.find((j) => j.id === id);
    const restoreTo: JobStatus = (current?.previousStatus as JobStatus | null) ?? "saved";
    const { error } = await supabase
      .from("jobs")
      .update({
        status: restoreTo,
        archive_type: null,
        rejection_tag: null,
        rejection_reason: null,
        archived_at: null,
      } as any)
      .eq("id", id);
    if (error) toast.error(error.message);
  }, [jobs]);

  return { jobs, addJob, updateJob, removeJob, moveJob, archiveJob, unarchiveJob, setRejection };
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export type AlarmLevel = "none" | "warn" | "danger";

export function alarmFor(job: Job): AlarmLevel {
  if (job.status !== "applied" && job.status !== "interviewing") return "none";
  const d = daysSince(job.updatedAt);
  if (d >= 21) return "danger";
  if (d >= 14) return "warn";
  return "none";
}

// Find jobs that have been ghosted: in applied/interviewing for `thresholdDays`+ without status change
export function findGhostingCandidates(jobs: Job[], thresholdDays: number): Job[] {
  return jobs.filter(
    (j) =>
      (j.status === "applied" || j.status === "interviewing") &&
      daysSince(j.updatedAt) >= thresholdDays
  );
}
