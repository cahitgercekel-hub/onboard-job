import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ArchiveType, type Job } from "@/lib/types";
import { Archive } from "lucide-react";

interface Props {
  open: boolean;
  job: Job | null;
  onOpenChange: (v: boolean) => void;
  onConfirm: (archiveType: ArchiveType, opts?: { rejectionReason?: string }) => void;
  defaultType?: Exclude<ArchiveType, "rejected">;
}

// Archive is now strictly for "Closed" and "Ghosted" terminal states.
// Rejections live in the active Kanban "Rejected" column instead.
const ARCHIVE_OPTIONS: { value: Exclude<ArchiveType, "rejected">; label: string }[] = [
  { value: "closed", label: "Position closed" },
  { value: "ghosted", label: "Ghosted (no reply)" },
];

export function ArchiveDialog({ open, job, onOpenChange, onConfirm, defaultType }: Props) {
  const [type, setType] = useState<Exclude<ArchiveType, "rejected">>(defaultType ?? "closed");
  const [reason, setReason] = useState("");

  const submit = () => {
    onConfirm(type, { rejectionReason: reason.trim() || undefined });
    onOpenChange(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-accent" /> Archive job
          </DialogTitle>
          <DialogDescription>
            {job ? <>Move <span className="font-medium text-foreground">{job.role}</span> at <span className="font-medium text-foreground">{job.company}</span> to your archive.</> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Reason</Label>
            <Select value={type} onValueChange={(v) => setType(v as Exclude<ArchiveType, "rejected">)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ARCHIVE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Anything worth remembering for next time…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>
            <Archive className="h-4 w-4" /> Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
