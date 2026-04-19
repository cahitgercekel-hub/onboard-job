import { useEffect, useState, useCallback } from "react";
import type { Job, JobStatus, ApplicationType, Industry, WorkModel } from "./types";
import { STATUS_ORDER, APPLICATION_TYPES, INDUSTRIES, WORK_MODELS } from "./types";

const KEY = "jat.jobs.v1";

function read(): Job[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Job[];
  } catch {
    return [];
  }
}

function write(jobs: Job[]) {
  localStorage.setItem(KEY, JSON.stringify(jobs));
  window.dispatchEvent(new CustomEvent("jat:jobs-changed"));
}

export function readAllJobs(): Job[] {
  return read();
}

export function clearAllJobs() {
  write([]);
}

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = String(value).replace(/\r?\n/g, " ").trim();
  if (/[",;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportJobsAsCsv(): string {
  const headers = [
    "Company", "Role", "Status", "Application Type", "Industry",
    "Work Model", "Location", "Date Applied", "URL", "Notes", "Job Description",
  ];
  const rows = read().map((j) => [
    j.company, j.role, j.status, j.applicationType ?? "", j.industry ?? "",
    j.workModel ?? "", j.location ?? "", j.dateApplied ?? "", j.url ?? "",
    j.notes ?? "", j.jobDescription ?? "",
  ]);
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

export function downloadJobsCsv() {
  const csv = exportJobsAsCsv();
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `careerdesk-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- CSV Import ----------

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
      errors,
      warnings,
      job: {
        company, role, status,
        applicationType: appType,
        industry,
        workModel,
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

export function importJobs(rows: ParsedImportRow[]): number {
  const valid = rows.filter((r) => r.errors.length === 0);
  const now = new Date().toISOString();
  const newJobs: Job[] = valid.map((r) => ({
    ...r.job,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }));
  write([...newJobs, ...read()]);
  return newJobs.length;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(() => read());

  useEffect(() => {
    const handler = () => setJobs(read());
    window.addEventListener("jat:jobs-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("jat:jobs-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const addJob = useCallback((data: Omit<Job, "id" | "createdAt" | "updatedAt">): Job => {
    const now = new Date().toISOString();
    const job: Job = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    write([job, ...read()]);
    return job;
  }, []);

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    const all = read();
    const next = all.map((j) => {
      if (j.id !== id) return j;
      const statusChanged = patch.status && patch.status !== j.status;
      return {
        ...j,
        ...patch,
        updatedAt: statusChanged ? new Date().toISOString() : j.updatedAt,
      };
    });
    write(next);
  }, []);

  const removeJob = useCallback((id: string) => {
    write(read().filter((j) => j.id !== id));
  }, []);

  const moveJob = useCallback((id: string, status: JobStatus) => {
    const all = read();
    const next = all.map((j) =>
      j.id === id ? { ...j, status, updatedAt: new Date().toISOString() } : j
    );
    write(next);
  }, []);

  return { jobs, addJob, updateJob, removeJob, moveJob };
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
