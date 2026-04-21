import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Filter, Sparkles, Calendar as CalendarIcon, ArrowUpDown, Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useJobs } from "@/lib/jobsStore";
import { APPLICATION_TYPES, INDUSTRIES, STATUS_ORDER, WORK_MODELS, type Job, type JobStatus } from "@/lib/types";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { JobDialog } from "@/components/kanban/JobDialog";
import { JobCard } from "@/components/kanban/JobCard";
import { AutoAddDialog } from "@/components/kanban/AutoAddDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const ALL = "__all__";
type DateChip = "any" | "3" | "7" | "30" | "older" | "custom";
type SortKey = "default" | "score-desc" | "date-desc" | "date-asc" | "company-asc";

export default function Tracker() {
  const { t } = useTranslation();
  const { jobs, addJob, updateJob, removeJob, moveJob } = useJobs();
  const [appType, setAppType] = useState<string>(ALL);
  const [industry, setIndustry] = useState<string>(ALL);
  const [workModel, setWorkModel] = useState<string>(ALL);
  const [dateChip, setDateChip] = useState<DateChip>("any");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [dialog, setDialog] = useState<{ open: boolean; status: JobStatus; job?: Job; key: number }>({
    open: false, status: "saved", key: 0,
  });
  const [autoOpen, setAutoOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const activeJob = useMemo(() => jobs.find((j) => j.id === activeId) ?? null, [jobs, activeId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const dateMatches = (job: Job): boolean => {
    if (dateChip === "any") return true;
    if (!job.dateApplied) return false;
    const applied = new Date(job.dateApplied).getTime();
    const now = Date.now();
    const days = (now - applied) / (1000 * 60 * 60 * 24);
    if (dateChip === "3") return days <= 3;
    if (dateChip === "7") return days <= 7;
    if (dateChip === "30") return days <= 30;
    if (dateChip === "older") return days > 30;
    if (dateChip === "custom") {
      if (customFrom && applied < customFrom.getTime()) return false;
      if (customTo && applied > customTo.getTime() + 86400000) return false;
      return true;
    }
    return true;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        (appType === ALL || j.applicationType === appType) &&
        (industry === ALL || j.industry === industry) &&
        (workModel === ALL || j.workModel === workModel) &&
        dateMatches(j) &&
        (q === "" ||
          (j.company || "").toLowerCase().includes(q) ||
          (j.role || "").toLowerCase().includes(q) ||
          (j.location || "").toLowerCase().includes(q) ||
          (j.notes || "").toLowerCase().includes(q))
    );
  }, [jobs, appType, industry, workModel, dateChip, customFrom, customTo, search]);

  const byStatus = useMemo(() => {
    const m: Record<JobStatus, Job[]> = { saved: [], applied: [], interviewing: [], offer: [], rejected: [] };
    for (const j of filtered) m[j.status].push(j);
    if (sortKey !== "default") {
      const cmp = (a: Job, b: Job): number => {
        if (sortKey === "score-desc") return (b.fitnessScore ?? -1) - (a.fitnessScore ?? -1);
        if (sortKey === "company-asc") return (a.company || "").localeCompare(b.company || "");
        const aT = a.dateApplied ? new Date(a.dateApplied).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bT = b.dateApplied ? new Date(b.dateApplied).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return sortKey === "date-desc" ? bT - aT : aT - bT;
      };
      for (const k of Object.keys(m) as JobStatus[]) m[k].sort(cmp);
    }
    return m;
  }, [filtered, sortKey]);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as JobStatus;
    const job = jobs.find((j) => j.id === active.id);
    if (job && job.status !== newStatus) moveJob(job.id, newStatus);
  };

  const openAdd = (status: JobStatus) => setDialog({ open: true, status, job: undefined, key: Date.now() });
  const openEdit = (job: Job) => setDialog({ open: true, status: job.status, job, key: Date.now() });

  const activeCount =
    (appType !== ALL ? 1 : 0) +
    (industry !== ALL ? 1 : 0) +
    (workModel !== ALL ? 1 : 0) +
    (dateChip !== "any" ? 1 : 0);

  const clearAll = () => {
    setAppType(ALL); setIndustry(ALL); setWorkModel(ALL);
    setDateChip("any"); setCustomFrom(undefined); setCustomTo(undefined);
  };

  const dateChips: { id: DateChip; label: string }[] = [
    { id: "3", label: t("filters.last3") },
    { id: "7", label: t("filters.last7") },
    { id: "30", label: t("filters.last30") },
    { id: "older", label: t("filters.older30") },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card/60 backdrop-blur px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">{t("tracker.title")}</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              <span>{t("tracker.jobs", { count: jobs.length })}</span>
              <span className="hidden md:inline"> · {t("common.dragHint")}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SortMenu sortKey={sortKey} onChange={setSortKey} />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-11 md:h-9">
                  <Filter className="h-3.5 w-3.5" />
                  {t("common.filter")}
                  {activeCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeCount}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-[340px] p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">{t("filters.appType")}</Label>
                    <Select value={appType} onValueChange={setAppType}>
                      <SelectTrigger className="h-11 md:h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>{t("filters.allTypes")}</SelectItem>
                        {APPLICATION_TYPES.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">{t("filters.industry")}</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="h-11 md:h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>{t("filters.allIndustries")}</SelectItem>
                        {INDUSTRIES.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">{t("filters.workModel")}</Label>
                  <Select value={workModel} onValueChange={setWorkModel}>
                    <SelectTrigger className="h-11 md:h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>{t("filters.allModels")}</SelectItem>
                      {WORK_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs">{t("filters.dateApplied")}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => { setDateChip("any"); setCustomFrom(undefined); setCustomTo(undefined); }}
                      className={cn(
                        "text-xs px-2.5 py-1.5 rounded-md border transition min-h-[32px]",
                        dateChip === "any" ? "bg-accent text-accent-foreground border-accent" : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      {t("filters.anyDate")}
                    </button>
                    {dateChips.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setDateChip(c.id); setCustomFrom(undefined); setCustomTo(undefined); }}
                        className={cn(
                          "text-xs px-2.5 py-1.5 rounded-md border transition min-h-[32px]",
                          dateChip === c.id ? "bg-accent text-accent-foreground border-accent" : "border-border bg-background hover:bg-muted"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-border pt-2 mt-1">
                    <div className="text-[11px] text-muted-foreground mb-1.5">{t("filters.customRange")}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <DateRangeField label={t("filters.from")} value={customFrom} onChange={(d) => { setCustomFrom(d); setDateChip("custom"); }} />
                      <DateRangeField label={t("filters.to")} value={customTo} onChange={(d) => { setCustomTo(d); setDateChip("custom"); }} />
                    </div>
                  </div>
                </div>

                {activeCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full min-h-[44px]" onClick={clearAll}>
                    {t("common.clear")}
                  </Button>
                )}
              </PopoverContent>
            </Popover>
            <Button variant="ai" onClick={() => setAutoOpen(true)} className="group h-11 md:h-9 px-3">
              <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
              <span className="hidden sm:inline">{t("tracker.autoAdd")}</span>
              <span className="sm:hidden">AI</span>
            </Button>
            <Button variant="outline" onClick={() => openAdd("saved")} className="h-11 md:h-9 px-3">
              <span className="hidden sm:inline">+ {t("tracker.addJob")}</span>
              <span className="sm:hidden">+ Add</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto snap-x snap-mandatory md:snap-none">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="flex gap-4 px-4 py-4 md:p-6 min-h-full">
            {STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                jobs={byStatus[status]}
                onAdd={() => openAdd(status)}
                onCardClick={openEdit}
                hiddenId={activeId}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeJob ? (
              <div className="w-[260px] rotate-1">
                <JobCard job={activeJob} onClick={() => {}} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {dialog.open && (
        <JobDialog
          key={dialog.key}
          open={dialog.open}
          onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}
          initialStatus={dialog.status}
          job={dialog.job}
          onSave={(data) => {
            if (dialog.job) updateJob(dialog.job.id, data);
            else addJob(data);
          }}
          onDelete={dialog.job ? () => removeJob(dialog.job!.id) : undefined}
        />
      )}

      <AutoAddDialog
        open={autoOpen}
        onOpenChange={setAutoOpen}
        onExtracted={async (data) => {
          const newJob = await addJob(data);
          if (newJob) setDialog({ open: true, status: newJob.status, job: newJob, key: Date.now() });
        }}
      />
    </div>
  );
}

function DateRangeField({ label, value, onChange }: { label: string; value?: Date; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 justify-start font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {value ? format(value, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

function SortMenu({ sortKey, onChange }: { sortKey: SortKey; onChange: (k: SortKey) => void }) {
  const options: { key: SortKey; label: string }[] = [
    { key: "score-desc", label: "Match Score: High to Low" },
    { key: "date-desc", label: "Date: Newest First" },
    { key: "date-asc", label: "Date: Oldest First" },
    { key: "company-asc", label: "Company: A–Z" },
  ];
  const active = options.find((o) => o.key === sortKey);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 md:h-9">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort
          {active && (
            <span className="ml-1 hidden sm:inline text-xs text-muted-foreground truncate max-w-[120px]">
              · {active.label.split(":")[0]}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn("cursor-pointer", sortKey === o.key && "font-semibold")}
          >
            <Check className={cn("h-4 w-4 mr-2", sortKey === o.key ? "opacity-100" : "opacity-0")} />
            {o.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onChange("default")}
          className={cn("cursor-pointer", sortKey === "default" && "font-semibold")}
        >
          <Check className={cn("h-4 w-4 mr-2", sortKey === "default" ? "opacity-100" : "opacity-0")} />
          Default order
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
