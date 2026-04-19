import { useEffect, useState, useCallback } from "react";
import type { Job, JobStatus } from "./types";

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
