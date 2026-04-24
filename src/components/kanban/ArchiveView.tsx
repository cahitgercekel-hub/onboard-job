import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ARCHIVE_TYPE_LABEL, STATUS_LABEL, type Job } from "@/lib/types";
import { Archive, RotateCcw, Search, Trash2, ExternalLink } from "lucide-react";
import { usePrefs } from "@/lib/preferences";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobs: Job[];
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

const TYPE_TONE: Record<string, string> = {
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  ghosted: "bg-muted text-muted-foreground border-border",
  closed: "bg-warning/10 text-warning border-warning/30",
};

export function ArchiveView({ open, onOpenChange, jobs, onUnarchive, onDelete }: Props) {
  const { formatDate } = usePrefs();
  const [q, setQ] = useState("");

  const archived = useMemo(() => {
    const list = jobs.filter((j) => j.status === "archived");
    list.sort((a, b) => {
      const at = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
      const bt = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
      return bt - at;
    });
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((j) =>
      (j.company || "").toLowerCase().includes(s) ||
      (j.role || "").toLowerCase().includes(s) ||
      (j.rejectionTag || "").toLowerCase().includes(s)
    );
  }, [jobs, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-accent" /> Archive
          </DialogTitle>
          <DialogDescription>{archived.length} archived job{archived.length === 1 ? "" : "s"}. Restore one to send it back to the active board.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search archive…" className="pl-8" />
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2">
          {archived.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-10">
              {q ? "No matches in your archive." : "Nothing archived yet."}
            </div>
          )}
          {archived.map((j) => {
            const tone = TYPE_TONE[j.archiveType ?? "closed"] ?? TYPE_TONE.closed;
            return (
              <div key={j.id} className="surface-card p-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{j.role}</div>
                      <div className="text-xs text-muted-foreground truncate">{j.company}</div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", tone)}>
                      {j.archiveType ? ARCHIVE_TYPE_LABEL[j.archiveType] : "Archived"}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground items-center">
                    {j.rejectionTag && <Badge variant="secondary" className="text-[10px]">{j.rejectionTag}</Badge>}
                    {j.previousStatus && <span>From {STATUS_LABEL[j.previousStatus]}</span>}
                    {j.archivedAt && <span>· Archived {formatDate(j.archivedAt)}</span>}
                    {j.url && (
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(j.url, "_blank", "noopener,noreferrer");
                        }}
                        className="inline-flex items-center gap-0.5 hover:text-foreground"
                      >
                        Link <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {j.rejectionReason && (
                    <p className="mt-1.5 text-xs text-foreground/80 line-clamp-2">{j.rejectionReason}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => onUnarchive(j.id)} className="h-8">
                    <RotateCcw className="h-3.5 w-3.5" /> Restore
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(j.id)} className="h-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
