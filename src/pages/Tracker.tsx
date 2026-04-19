import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Filter, Sparkles } from "lucide-react";
import { useJobs } from "@/lib/jobsStore";
import { APPLICATION_TYPES, INDUSTRIES, STATUS_ORDER, type Job, type JobStatus } from "@/lib/types";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { JobDialog } from "@/components/kanban/JobDialog";
import { JobCard } from "@/components/kanban/JobCard";
import { AutoAddDialog } from "@/components/kanban/AutoAddDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const ALL = "__all__";

export default function Tracker() {
  const { jobs, addJob, updateJob, removeJob, moveJob } = useJobs();
  const [appType, setAppType] = useState<string>(ALL);
  const [industry, setIndustry] = useState<string>(ALL);
  const [dialog, setDialog] = useState<{ open: boolean; status: JobStatus; job?: Job; key: number }>({
    open: false,
    status: "saved",
    key: 0,
  });
  const [autoOpen, setAutoOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeJob = useMemo(() => jobs.find((j) => j.id === activeId) ?? null, [jobs, activeId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filtered = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (appType === ALL || j.applicationType === appType) &&
          (industry === ALL || j.industry === industry)
      ),
    [jobs, appType, industry]
  );

  const byStatus = useMemo(() => {
    const m: Record<JobStatus, Job[]> = { saved: [], applied: [], interviewing: [], offer: [], rejected: [] };
    for (const j of filtered) m[j.status].push(j);
    return m;
  }, [filtered]);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as JobStatus;
    const job = jobs.find((j) => j.id === active.id);
    if (job && job.status !== newStatus) moveJob(job.id, newStatus);
  };

  const openAdd = (status: JobStatus) =>
    setDialog({ open: true, status, job: undefined, key: Date.now() });
  const openEdit = (job: Job) =>
    setDialog({ open: true, status: job.status, job, key: Date.now() });

  const filtersActive = appType !== ALL || industry !== ALL;
  const activeCount = (appType !== ALL ? 1 : 0) + (industry !== ALL ? 1 : 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card/60 backdrop-blur px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Application Tracker</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"} · drag cards between columns
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                  {activeCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeCount}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-4 space-y-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Application type</Label>
                  <Select value={appType} onValueChange={setAppType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All types</SelectItem>
                      {APPLICATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All industries</SelectItem>
                      {INDUSTRIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {filtersActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => { setAppType(ALL); setIndustry(ALL); }}
                  >
                    Clear filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
            <Button variant="ai" onClick={() => setAutoOpen(true)} className="group">
              <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
              Auto-add with AI
            </Button>
            <Button variant="outline" onClick={() => openAdd("saved")}>+ Add job</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="flex gap-4 p-6 min-h-full">
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
        onExtracted={(data) => {
          const newJob = addJob(data);
          setDialog({ open: true, status: newJob.status, job: newJob, key: Date.now() });
        }}
      />
    </div>
  );
}
