import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REJECTION_TAGS, type Job } from "@/lib/types";
import { XCircle } from "lucide-react";

interface Props {
  open: boolean;
  job: Job | null;
  onOpenChange: (v: boolean) => void;
  onConfirm: (tag: string, reason?: string) => void;
  onCancel?: () => void;
}

export function RejectionDialog({ open, job, onOpenChange, onConfirm, onCancel }: Props) {
  const [tag, setTag] = useState<string>(REJECTION_TAGS[0]);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setTag(job?.rejectionTag || REJECTION_TAGS[0]);
      setReason(job?.rejectionReason || "");
    }
  }, [open, job]);

  const submit = () => {
    onConfirm(tag, reason.trim() || undefined);
    onOpenChange(false);
  };

  const cancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cancel(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" /> Mark as rejected
          </DialogTitle>
          <DialogDescription>
            {job ? <>Why was <span className="font-medium text-foreground">{job.role}</span> at <span className="font-medium text-foreground">{job.company}</span> rejected?</> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Rejection reason</Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REJECTION_TAGS.map((rt) => (
                  <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Feedback, lessons learned…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={cancel}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
