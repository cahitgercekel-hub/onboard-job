import { describe, expect, it } from "vitest";
import { buildFunnelData, FUNNEL_NOT_APPLIED, FUNNEL_TRACKED } from "@/lib/funnelData";
import type { Job } from "@/lib/types";

function job(id: string, status: Job["status"], extra: Partial<Job> = {}): Job {
  return { id, company: "C", role: "R", status, createdAt: "", updatedAt: "", ...extra } as Job;
}

const link = (data: ReturnType<typeof buildFunnelData>, s: string, t: string) =>
  data.links.find((l) => l.source === s && l.target === t)?.value ?? 0;

describe("application funnel", () => {
  const jobs = [
    job("1", "saved"), job("2", "saved"),
    job("3", "applied"), job("4", "applied"), job("5", "applied"),
    job("6", "interviewing"),
    job("7", "rejected", { previousStatus: "interviewing" }),
    job("8", "archived", { archiveType: "closed", previousStatus: "applied" }),
  ];
  const data = buildFunnelData(jobs);

  it("sends jobs never applied to into their own 'Not applied yet' branch, equal to the Saved count", () => {
    expect(link(data, FUNNEL_TRACKED, FUNNEL_NOT_APPLIED)).toBe(2);
  });

  it("starts from all tracked jobs except closed postings", () => {
    const fromRoot = data.links.filter((l) => l.source === FUNNEL_TRACKED).reduce((a, l) => a + l.value, 0);
    expect(fromRoot).toBe(7);
  });

  it("credits Interviewing for a job rejected after an interview", () => {
    expect(link(data, "applied", "interviewing")).toBe(2);
    expect(link(data, "interviewing", "rejected")).toBe(1);
  });
});
