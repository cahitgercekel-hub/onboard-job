import { useState } from "react";
import { Search, MapPin, FileText, Filter, ChevronDown, ChevronLeft, Sparkles, Plus, Loader2, ExternalLink, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useCvVersions } from "@/lib/cvVersionsStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Job, JobStatus, WorkModel, ApplicationType } from "@/lib/types";

interface DiscoveredJob {
  company: string;
  role: string;
  location: string;
  workModel?: WorkModel;
  applicationType?: ApplicationType;
  description?: string;
  daysAgo: number;
  matchScore: number;
  matchReason: string;
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  onAdd: (data: Omit<Job, "id" | "createdAt" | "updatedAt">) => Promise<Job | null>;
}

const BASELINE = "__baseline__";

function matchTone(score: number) {
  if (score >= 75) return { label: "Good Match", cls: "bg-success/15 text-success border-success/30" };
  if (score >= 50) return { label: "Medium Match", cls: "bg-warning/15 text-warning border-warning/30" };
  return { label: "Low Match", cls: "bg-destructive/15 text-destructive border-destructive/30" };
}

export function DiscoveryPanel({ collapsed, onToggle, onAdd }: Props) {
  const { versions } = useCvVersions();
  const [cvId, setCvId] = useState<string>(BASELINE);
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState("any");
  const [jobType, setJobType] = useState("any");
  const [remote, setRemote] = useState("any");
  const [sortBy, setSortBy] = useState<"relevance" | "date">("relevance");
  const [results, setResults] = useState<DiscoveredJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Set<number>>(new Set());

  const runSearch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("discover-jobs", {
        body: {
          query, location,
          cvVersionId: cvId === BASELINE ? null : cvId,
          dateRange, jobType, remote, sortBy,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResults((data as any).jobs ?? []);
      if (((data as any).jobs ?? []).length === 0) toast.info("No matches — try different filters.");
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (j: DiscoveredJob, idx: number) => {
    setAdding((s) => new Set(s).add(idx));
    const created = await onAdd({
      company: j.company,
      role: j.role,
      status: "saved" as JobStatus,
      location: j.location,
      workModel: j.workModel,
      applicationType: j.applicationType,
      jobDescription: j.description,
      notes: `AI Match: ${j.matchScore}/100 — ${j.matchReason}`,
    });
    setAdding((s) => { const n = new Set(s); n.delete(idx); return n; });
    if (created) toast.success(`Added ${j.company} to Saved`);
  };

  const clearFilters = () => {
    setDateRange("any"); setJobType("any"); setRemote("any");
  };

  if (collapsed) {
    return (
      <div className="hidden md:flex shrink-0 w-10 border-r border-border bg-card/40 flex-col items-center py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              className="h-9 w-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Open AI Job Match"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">AI Job Match</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <aside className="hidden md:flex shrink-0 w-[360px] lg:w-[380px] border-r border-border bg-card/40 flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-accent shrink-0" />
          <h2 className="text-sm font-semibold truncate">AI Job Match</h2>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Collapse panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Collapse</TooltipContent>
        </Tooltip>
      </div>

      <div className="px-4 py-3 space-y-3 border-b border-border">
        <div className="grid gap-1.5">
          <Label className="text-xs flex items-center gap-1.5"><FileText className="h-3 w-3" /> CV Profile</Label>
          <Select value={cvId} onValueChange={setCvId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={BASELINE}>Baseline CV</SelectItem>
              {versions.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Search className="h-3 w-3" /> Search</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Product Manager, fintech" className="h-9" />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Berlin, remote, EU…" className="h-9" />
        </div>
        <Button onClick={runSearch} disabled={loading} className="w-full h-9" variant="ai">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Searching…" : "Search"}
        </Button>

        <Accordion type="single" collapsible>
          <AccordionItem value="filters" className="border-0">
            <AccordionTrigger className="py-2 text-xs hover:no-underline">
              <span className="flex items-center gap-1.5"><Filter className="h-3 w-3" /> Filters</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pb-2">
              <div className="grid gap-1.5">
                <Label className="text-[11px]">Date range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any time</SelectItem>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px]">Job type</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px]">Remote option</Label>
                <Select value={remote} onValueChange={setRemote}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={clearFilters}>Clear all</Button>
                <Button variant="outline" size="sm" className="flex-1 h-8" onClick={runSearch} disabled={loading}>Apply</Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1"><ArrowUpDown className="h-3 w-3" /> Sort by</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "relevance" | "date")}>
            <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {results.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground text-center py-12 px-4">
            Enter a search and we'll surface AI-scored matches against your CV.
          </p>
        )}
        {loading && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">Scoring matches…</span>
          </div>
        )}
        {results.map((j, i) => {
          const tone = matchTone(j.matchScore);
          const isAdding = adding.has(i);
          return (
            <div key={i} className="rounded-md border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", tone.cls)}>
                  {j.matchScore} · {tone.label}
                </div>
                <Badge variant="outline" className="text-[10px] h-5">Posted {j.daysAgo}d ago</Badge>
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground leading-tight">{j.role}</div>
                <div className="text-xs text-muted-foreground">{j.company}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3 inline mr-1" />{j.location}{j.workModel ? ` · ${j.workModel}` : ""}
                </div>
              </div>
              {j.matchReason && (
                <p className="text-[11px] text-muted-foreground line-clamp-2">{j.matchReason}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8"
                onClick={() => handleAdd(j, i)}
                disabled={isAdding}
              >
                {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Add to Saved
              </Button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-4 py-2 text-center">
        <a
          href="https://www.linkedin.com/jobs/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground hover:text-accent inline-flex items-center gap-1"
        >
          Find more jobs <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </aside>
  );
}
