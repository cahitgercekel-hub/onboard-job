export type JobStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected";

export const STATUS_LABEL: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

export const STATUS_ORDER: JobStatus[] = ["saved", "applied", "interviewing", "offer", "rejected"];

export const APPLICATION_TYPES = [
  "Working Student",
  "Internship",
  "Full-time",
  "Part-time",
  "Contract",
  "Freelance",
] as const;

export const INDUSTRIES = [
  "Tech",
  "Automotive",
  "Consulting",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Manufacturing",
  "Media",
  "Education",
  "Other",
] as const;

export const WORK_MODELS = ["Remote", "Hybrid", "On-site"] as const;

export type ApplicationType = (typeof APPLICATION_TYPES)[number];
export type Industry = (typeof INDUSTRIES)[number];
export type WorkModel = (typeof WORK_MODELS)[number];

export interface Job {
  id: string;
  company: string;
  role: string;
  url?: string;
  dateApplied?: string; // ISO
  status: JobStatus;
  applicationType?: ApplicationType;
  industry?: Industry;
  workModel?: WorkModel;
  location?: string;
  jobDescription?: string;
  notes?: string;
  fitnessScore?: number | null;
  fitnessReasoning?: string | null;
  createdAt: string;
  updatedAt: string; // bumped when status changes
}
