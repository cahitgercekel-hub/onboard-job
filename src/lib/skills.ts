// Lightweight client-side skill keyword extraction.
// We use a curated allow-list of common job-skill keywords and multi-word phrases
// so the heatmap stays meaningful without an LLM round-trip per render.

import type { Job } from "./types";

export const SKILL_DICTIONARY: string[] = [
  // Languages
  "javascript", "typescript", "python", "java", "kotlin", "swift", "go", "rust",
  "c++", "c#", "ruby", "php", "scala", "sql", "bash",
  // Frontend
  "react", "next.js", "vue", "angular", "svelte", "redux", "tailwind", "css", "html",
  // Backend
  "node.js", "express", "django", "flask", "spring", "rails", "graphql", "rest api",
  // Data
  "postgres", "mysql", "mongodb", "redis", "elasticsearch", "snowflake", "bigquery",
  "kafka", "spark", "airflow", "dbt", "etl",
  // Cloud / DevOps
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd", "github actions",
  "jenkins", "linux",
  // AI / ML
  "machine learning", "deep learning", "pytorch", "tensorflow", "llm", "nlp",
  "computer vision", "data science", "pandas", "numpy",
  // Product / Mgmt
  "agile", "scrum", "kanban", "jira", "stakeholder", "roadmap", "okrs",
  "product management", "project management", "leadership", "mentoring",
  // Design
  "figma", "ux", "ui", "user research", "prototyping", "design system",
  // Soft / business
  "communication", "analytics", "a/b testing", "kpi", "strategy", "negotiation",
  "presentation", "cross-functional",
  // Marketing
  "seo", "sem", "google ads", "hubspot", "crm", "salesforce", "content marketing",
  // Other
  "git", "rest", "microservices", "saas", "b2b", "b2c",
];

export interface SkillStat {
  skill: string;
  jobMentions: number;     // # of jobs that mention this skill
  cvHas: boolean;
  // 0..100 demand from JDs (relative to top skill in the set)
  demand: number;
  // 0..100 user coverage (100 if in CV, else 0)
  coverage: number;
}

const norm = (s: string) => s.toLowerCase();

function countSkillMentions(text: string, skills: string[]): Set<string> {
  const t = norm(text);
  const found = new Set<string>();
  for (const skill of skills) {
    // Word-boundary-ish: ensure skill is bounded by non-letters or string ends
    const s = norm(skill);
    if (!t.includes(s)) continue;
    // crude bounding to reduce false positives like "react" inside "reaction"
    const re = new RegExp(`(^|[^a-z0-9])${s.replace(/[+#./()]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    if (re.test(t)) found.add(skill);
  }
  return found;
}

export function buildSkillStats(jobs: Job[], cvText: string | null | undefined, opts?: { topN?: number }): SkillStat[] {
  const topN = opts?.topN ?? 10;

  const jobCounts = new Map<string, number>();
  for (const j of jobs) {
    if (!j.jobDescription) continue;
    const found = countSkillMentions(j.jobDescription, SKILL_DICTIONARY);
    for (const skill of found) {
      jobCounts.set(skill, (jobCounts.get(skill) ?? 0) + 1);
    }
  }

  if (jobCounts.size === 0) return [];

  const cvSkills = cvText ? countSkillMentions(cvText, SKILL_DICTIONARY) : new Set<string>();

  const max = Math.max(...jobCounts.values());

  const stats: SkillStat[] = [...jobCounts.entries()]
    .map(([skill, mentions]) => ({
      skill,
      jobMentions: mentions,
      cvHas: cvSkills.has(skill),
      demand: Math.round((mentions / max) * 100),
      coverage: cvSkills.has(skill) ? 100 : 0,
    }))
    .sort((a, b) => b.jobMentions - a.jobMentions)
    .slice(0, topN);

  return stats;
}

export function topMissingSkills(stats: SkillStat[], n = 3): string[] {
  return stats.filter((s) => !s.cvHas).slice(0, n).map((s) => s.skill);
}

// Title-case helper for chart axis labels
export function prettySkill(s: string): string {
  if (s.length <= 3) return s.toUpperCase();
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
