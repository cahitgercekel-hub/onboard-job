import { useState } from "react";
import { Search, MapPin, FileText, Filter, ChevronLeft, Sparkles, Plus, Loader2, ArrowUpDown, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useCvVersions } from "@/lib/cvVersionsStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/CompanyLogo";
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
  url?: string;
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  onAdd: (data: Omit<Job, "id" | "createdAt" | "updatedAt">) => Promise<Job | null>;
}

const BASELINE = "__baseline__";

function matchTone(score: number) {
  if (score >= 75) return { label: "Good", cls: "bg-success/15 text-success border-success/30" };
  if (score >= 50) return { label: "Medium", cls: "bg-warning/15 text-warning border-warning/30" };
  return { label: "Low", cls: "bg-destructive/15 text-destructive border-destructive/30" };
}

function buildSearchUrl(j: DiscoveredJob): string {
  const q = encodeURIComponent(`${j.role} ${j.company}`);
  const loc = j.location ? `&location=${encodeURIComponent(j.location)}` : "";
  return `https://www.linkedin.com/jobs/search/?keywords=${q}${loc}`;
}

export function DiscoveryPanel({ collapsed, onToggle, onAdd }: Props) {
  const { t } = useTranslation();
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

  const activeFilterCount =
    (dateRange !== "any" ? 1 : 0) + (jobType !== "any" ? 1 : 0) + (remote !== "any" ? 1 : 0);

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
    const url = j.url || buildSearchUrl(j);
    const created = await onAdd({
      company: j.company,
      role: j.role,
      status: "saved" as JobStatus,
      location: j.location,
      workModel: j.workModel,
      applicationType: j.applicationType,
      jobDescription: j.description,
      url,
      notes: `AI Match: ${j.matchScore}/100 — ${j.matchReason}`,
    });
    setAdding((s) => { const n = new Set(s); n.delete(idx); return n; });
    if (created) toast.success(t("tracker.addedToSaved", { company: j.company }));
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
              aria-label={t("discovery.expand")}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("discovery.expand")}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <aside className="hidden md:flex shrink-0 w-[340px] lg:w-[360px] border-r border-border bg-card/40 flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-accent shrink-0" />
          <h2 className="text-sm font-semibold truncate">{t("discovery.title")}</h2>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label={t("discovery.collapse")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("discovery.collapse")}</TooltipContent>
        </Tooltip>
      </div>

      {/* Compact search controls */}
      <div className="px-4 py-3 space-y-2 border-b border-border">
        <Select value={cvId} onValueChange={setCvId}>
          <SelectTrigger className="h-8 text-xs">
            <FileText className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BASELINE}>{t("discovery.baselineCv")}</SelectItem>
            {versions.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder={t("discovery.searchPlaceholder")}
            className="h-9 pl-8 text-sm"
          />
        </div>

        <div className="relative">
          <MapPin className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder={t("discovery.locationPlaceholder")}
            className="h-9 pl-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={runSearch} disabled={loading} className="flex-1 h-9" variant="ai">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? t("discovery.searching") : t("discovery.search")}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 relative shrink-0" aria-label={t("discovery.filters")}>
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold flex items-center justify-center px-1">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-72 p-3 space-y-3">
              <div className="grid gap-1.5">
                <Label className="text-[11px]">{t("filters.dateApplied")}</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t("discovery.anyTime")}</SelectItem>
                    <SelectItem value="24h">{t("discovery.last24h")}</SelectItem>
                    <SelectItem value="7d">{t("discovery.last7d")}</SelectItem>
                    <SelectItem value="30d">{t("discovery.last30d")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px]">{t("filters.appType")}</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t("common.any")}</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px]">{t("filters.workModel")}</Label>
                <Select value={remote} onValueChange={setRemote}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t("common.any")}</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={clearFilters}>{t("common.clear")}</Button>
                <Button variant="default" size="sm" className="flex-1 h-8" onClick={runSearch} disabled={loading}>{t("discovery.apply")}</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Results meta + sort (only when there are results) */}
        {results.length > 0 && (
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-muted-foreground">{t("discovery.matches", { count: results.length })}</span>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "relevance" | "date")}>
                <SelectTrigger className="h-7 w-[110px] text-[11px] border-0 bg-transparent px-1 focus:ring-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{t("discovery.relevance")}</SelectItem>
                  <SelectItem value="date">{t("discovery.date")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {results.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground text-center py-12 px-4">
            {t("discovery.empty")}
          </p>
        )}
        {loading && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">{t("discovery.scoring")}</span>
          </div>
        )}
        {results.map((j, i) => {
          const tone = matchTone(j.matchScore);
          const isAdding = adding.has(i);
          const linkUrl = j.url || buildSearchUrl(j);
          return (
            <div key={i} className="rounded-md border border-border bg-card p-3 space-y-2 hover:border-accent/50 transition-colors">
              <div className="flex items-start gap-3">
                <CompanyLogo company={j.company} url={j.url} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground leading-tight truncate">{j.role}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{j.company}</div>
                </div>
                <div className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0", tone.cls)}>
                  {j.matchScore}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />{j.location}
                </span>
                {j.workModel && <Badge variant="outline" className="text-[10px] h-4 px-1">{j.workModel}</Badge>}
                <span>· {t("discovery.daysAgo", { count: j.daysAgo })}</span>
              </div>

              {j.matchReason && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{j.matchReason}</p>
              )}

              <div className="flex gap-1.5 pt-0.5">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 h-8 text-xs"
                  onClick={() => handleAdd(j, i)}
                  disabled={isAdding}
                >
                  {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  {t("tracker.addToSaved")}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(linkUrl, "_blank", "noopener,noreferrer");
                      }}
                      aria-label={t("discovery.linkedinTooltip")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t("discovery.linkedinTooltip")}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
