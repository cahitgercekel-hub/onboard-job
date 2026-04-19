import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Filter, X } from "lucide-react";
import { useJobs } from "@/lib/jobsStore";
import { APPLICATION_TYPES, INDUSTRIES, STATUS_ORDER, type Job, type JobStatus } from "@/lib/types";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { JobDialog } from "@/components/kanban/JobDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const onDragEnd = (e: DragEndEvent) => {
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
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5" /> Filter
            </div>
            <Select value={appType} onValueChange={setAppType}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {APPLICATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Industry" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All industries</SelectItem>
                {INDUSTRIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={() => { setAppType(ALL); setIndustry(ALL); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
            <Button onClick={() => openAdd("saved")}>+ Add job</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex gap-4 p-6 min-h-full">
            {STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                jobs={byStatus[status]}
                onAdd={() => openAdd(status)}
                onCardClick={openEdit}
              />
            ))}
          </div>
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
    </div>
  );
}
