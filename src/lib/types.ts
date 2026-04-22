export type JobStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "archived";

export const STATUS_LABEL: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Archived",
};

// Active board columns only — "archived" is intentionally excluded
export const STATUS_ORDER: JobStatus[] = ["saved", "applied", "interviewing", "offer", "rejected"];

export type ArchiveType = "closed" | "rejected" | "ghosted";
export const ARCHIVE_TYPE_LABEL: Record<ArchiveType, string> = {
  closed: "Position closed",
  rejected: "Rejected",
  ghosted: "Ghosted (no reply)",
};

export const REJECTION_TAGS = [
  "ATS Reject",
  "Salary Mismatch",
  "Lacking Experience",
  "Cultural Fit",
  "Visa/Location Issues",
  "Role Filled/Closed",
] as const;
export type RejectionTag = (typeof REJECTION_TAGS)[number];

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
  archiveType?: ArchiveType | null;
  rejectionReason?: string | null;
  rejectionTag?: string | null;
  archivedAt?: string | null;
  previousStatus?: JobStatus | null;
  createdAt: string;
  updatedAt: string; // bumped when status changes
}
