// Categorize job titles into broad role buckets via keyword matching.
import type { Job } from "./types";

export type RoleCategory =
  | "Product Management"
  | "Marketing"
  | "Management & Strategy"
  | "Operations"
  | "Engineering/Tech"
  | "Design"
  | "Data/Analytics"
  | "Sales"
  | "Other";

export const ROLE_CATEGORIES: RoleCategory[] = [
  "Product Management",
  "Marketing",
  "Management & Strategy",
  "Operations",
  "Engineering/Tech",
  "Design",
  "Data/Analytics",
  "Sales",
  "Other",
];

const RULES: { category: Exclude<RoleCategory, "Other">; keywords: RegExp[] }[] = [
  {
    category: "Product Management",
    keywords: [/\bproduct\b/i, /\bpm\b/i, /\bprod(?:uct)? owner\b/i, /\broadmap\b/i, /\bproduct lead\b/i],
  },
  {
    category: "Marketing",
    keywords: [/\bmarketing\b/i, /\bgrowth\b/i, /\bbrand\b/i, /\bseo\b/i, /\bcontent\b/i, /\bcommunication(s)?\b/i],
  },
  {
    category: "Sales",
    keywords: [/\bsales\b/i, /\baccount executive\b/i, /\bbusiness development\b/i, /\bbdr\b/i, /\bsdr\b/i],
  },
  {
    category: "Data/Analytics",
    keywords: [/\bdata (scientist|analyst|engineer)\b/i, /\banalytics\b/i, /\bbi\b/i, /\bml engineer\b/i, /\bmachine learning\b/i],
  },
  {
    category: "Design",
    keywords: [/\bdesigner?\b/i, /\bux\b/i, /\bui\b/i, /\bcreative\b/i],
  },
  {
    category: "Engineering/Tech",
    keywords: [/\bengineer(ing)?\b/i, /\bdeveloper\b/i, /\bsoftware\b/i, /\bdevops\b/i, /\bsre\b/i, /\bbackend\b/i, /\bfrontend\b/i, /\bfull[- ]?stack\b/i, /\btechnical\b/i, /\barchitect\b/i],
  },
  {
    category: "Management & Strategy",
    keywords: [/\bconsult(ant|ing)\b/i, /\bstrategy\b/i, /\bmanager\b/i, /\bdirector\b/i, /\bhead of\b/i, /\bchief\b/i, /\bvp\b/i],
  },
  {
    category: "Operations",
    keywords: [/\boperations?\b/i, /\bops\b/i, /\bprocess\b/i, /\bsupply chain\b/i, /\blogistics\b/i, /\bproject manager\b/i],
  },
];

export function categorizeRole(title: string | null | undefined): RoleCategory {
  if (!title) return "Other";
  for (const rule of RULES) {
    if (rule.keywords.some((re) => re.test(title))) return rule.category;
  }
  return "Other";
}

export interface RoleStat {
  category: RoleCategory;
  count: number;
  avgScore: number | null;
  scoredCount: number;
}

export function buildRoleStats(jobs: Job[]): RoleStat[] {
  const map = new Map<RoleCategory, { count: number; total: number; scored: number }>();
  for (const j of jobs) {
    if (j.status === "saved") continue; // only count things they actually pursued
    const cat = categorizeRole(j.role);
    const cur = map.get(cat) ?? { count: 0, total: 0, scored: 0 };
    cur.count++;
    if (typeof j.fitnessScore === "number") {
      cur.total += j.fitnessScore;
      cur.scored++;
    }
    map.set(cat, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      count: v.count,
      avgScore: v.scored > 0 ? Math.round(v.total / v.scored) : null,
      scoredCount: v.scored,
    }))
    .sort((a, b) => b.count - a.count);
}
