import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARCHIVE_TYPE_LABEL, REJECTION_TAGS, type ArchiveType, type Job } from "@/lib/types";
import { Archive } from "lucide-react";

interface Props {
  open: boolean;
  job: Job | null;
  onOpenChange: (v: boolean) => void;
  onConfirm: (archiveType: ArchiveType, opts?: { rejectionTag?: string; rejectionReason?: string }) => void;
  defaultType?: ArchiveType;
}

export function ArchiveDialog({ open, job, onOpenChange, onConfirm, defaultType }: Props) {
  const [type, setType] = useState<ArchiveType>(defaultType ?? "rejected");
  const [tag, setTag] = useState<string>(REJECTION_TAGS[0]);
  const [reason, setReason] = useState("");

  const submit = () => {
    if (type === "rejected") {
      onConfirm("rejected", { rejectionTag: tag, rejectionReason: reason.trim() || undefined });
    } else {
      onConfirm(type, { rejectionReason: reason.trim() || undefined });
    }
    onOpenChange(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
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
            <Select value={type} onValueChange={(v) => setType(v as ArchiveType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ARCHIVE_TYPE_LABEL) as ArchiveType[]).map((k) => (
                  <SelectItem key={k} value={k}>{ARCHIVE_TYPE_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "rejected" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Rejection tag (powers analytics)</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REJECTION_TAGS.map((rt) => (
                    <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
