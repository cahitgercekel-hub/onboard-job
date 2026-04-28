import type { Job, JobStatus } from "./types";

// Numerical rank for "highest positive stage achieved"
const RANK: Record<string, number> = {
  saved: 1,
  applied: 2,
  interviewing: 3,
  offer: 4,
};

const STAGE_LABEL: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
  closed: "Closed",
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
  Saved: "hsl(var(--col-saved))",
  Applied: "hsl(var(--col-applied))",
  Interviewing: "hsl(var(--col-interviewing))",
  Offer: "hsl(var(--col-offer))",
  Rejected: "hsl(var(--col-rejected))",
  Ghosted: "hsl(var(--muted-foreground))",
  Closed: "hsl(var(--muted-foreground))",
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
    if (job.archiveType === "ghosted") return "Ghosted";
    if (job.archiveType === "closed") return null; // Closed jobs are excluded from the funnel
    return "Rejected";
  }
  if (job.status === "rejected") return "Rejected";
  return null; // still active in pipeline
}

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
    // Phase 2: completely exclude "Closed" jobs from the funnel calculations
    if (j.status === "archived" && j.archiveType === "closed") continue;
    const peak = highestStage(j);
    const peakRank = RANK[peak];

    // Every job's journey starts at "Saved", then progresses up to its peak.
    const chain: ("saved" | "applied" | "interviewing" | "offer")[] = ["saved"];
    if (peakRank >= 2) chain.push("applied");
    if (peakRank >= 3) chain.push("interviewing");
    if (peakRank >= 4) chain.push("offer");

    for (let i = 0; i < chain.length - 1; i++) {
      inc(STAGE_LABEL[chain[i]], STAGE_LABEL[chain[i + 1]]);
    }

    const term = terminalLabel(j);
    if (term) {
      // Drop-off connects from the peak stage directly to the terminal node.
      inc(STAGE_LABEL[peak], term);
    }

    // Always make sure peak node exists even with no outgoing links
    usedNodes.add(STAGE_LABEL[peak]);
  }

  // Order: positive funnel first (top), terminal drop-offs last (bottom).
  const orderedNodes = ["Saved", "Applied", "Interviewing", "Offer", "Rejected", "Ghosted"]
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
