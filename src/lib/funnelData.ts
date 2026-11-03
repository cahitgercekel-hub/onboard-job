import type { Job, JobStatus } from "./types";

// Numerical rank for "highest positive stage achieved"
const RANK: Record<string, number> = {
  saved: 1,
  applied: 2,
  interviewing: 3,
  offer: 4,
};

const STAGE_LABEL: Record<string, string> = {
  saved: "saved",
  applied: "applied",
  interviewing: "interviewing",
  offer: "offer",
  rejected: "rejected",
  ghosted: "ghosted",
  closed: "closed",
};

export interface SankeyNode {
  id: string;
  nodeColor?: string;
}
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}
export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Brand colors for active progressions (HSL strings — read from CSS vars at render time)
const COLORS: Record<string, string> = {
  tracked: "hsl(var(--primary))",
  not_applied: "hsl(var(--col-saved))",
  saved: "hsl(var(--col-saved))",
  applied: "hsl(var(--col-applied))",
  interviewing: "hsl(var(--col-interviewing))",
  offer: "hsl(var(--col-offer))",
  rejected: "hsl(var(--col-rejected))",
  ghosted: "hsl(var(--muted-foreground))",
  closed: "hsl(var(--muted-foreground))",
};

// Determine the highest positive stage a job actually reached.
// For active jobs that's just current status. For archived jobs, use previous_status.
function highestStage(job: Job): "saved" | "applied" | "interviewing" | "offer" {
  if (job.status === "archived") {
    const prev = job.previousStatus && RANK[job.previousStatus] ? job.previousStatus : "saved";
    return (prev as any) || "saved";
  }
  if (job.status === "rejected") {
    // Use previousStatus to know the highest stage reached before rejection
    // (e.g. Interviewing → Rejected should still credit Interviewing).
    const prev = job.previousStatus && RANK[job.previousStatus] ? job.previousStatus : "applied";
    return (prev as any) || "applied";
  }
  return job.status as "saved" | "applied" | "interviewing" | "offer";
}

function terminalLabel(job: Job): string | null {
  if (job.status === "archived") {
    if (job.archiveType === "ghosted") return "ghosted";
    if (job.archiveType === "closed") return null; // Closed jobs are excluded from the funnel
    return "rejected";
  }
  if (job.status === "rejected") return "rejected";
  return null; // still active in pipeline
}

// Node ids for the funnel root and the never-applied branch.
export const FUNNEL_TRACKED = "tracked";
export const FUNNEL_NOT_APPLIED = "not_applied";

/**
 * Funnel starting from every tracked job (closed postings excluded). Jobs never applied to get
 * their own "Not applied yet" branch, so Tracked = Not applied yet + Applied, matching the status cards.
 */
export function buildFunnelData(jobs: Job[]): SankeyData {
  const linkMap = new Map<string, number>();
  const usedNodes = new Set<string>();

  const inc = (src: string, tgt: string) => {
    if (src === tgt) return; // prevent circular loops
    const k = `${src}→${tgt}`;
    linkMap.set(k, (linkMap.get(k) ?? 0) + 1);
    usedNodes.add(src);
    usedNodes.add(tgt);
  };

  for (const j of jobs) {
    if (j.status === "archived" && j.archiveType === "closed") continue;
    const peak = highestStage(j);
    const peakRank = RANK[peak];

    if (peakRank < 2) {
      inc(FUNNEL_TRACKED, FUNNEL_NOT_APPLIED);
      continue;
    }

    const chain: string[] = [FUNNEL_TRACKED, "applied"];
    if (peakRank >= 3) chain.push("interviewing");
    if (peakRank >= 4) chain.push("offer");
    for (let i = 0; i < chain.length - 1; i++) inc(chain[i], chain[i + 1]);

    const term = terminalLabel(j);
    if (term) inc(STAGE_LABEL[peak], term);
  }

  const orderedNodes = [FUNNEL_TRACKED, FUNNEL_NOT_APPLIED, "applied", "interviewing", "offer", "rejected", "ghosted"]
    .filter((n) => usedNodes.has(n));

  const nodes: SankeyNode[] = orderedNodes.map((id) => ({
    id,
    nodeColor: COLORS[id],
  }));

  const links: SankeyLink[] = [];
  linkMap.forEach((value, k) => {
    const [source, target] = k.split("→");
    links.push({ source, target, value });
  });

  return { nodes, links };
}
