import { useState } from "react";
import { Files, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useCvVersions, type CvVersion } from "@/lib/cvVersionsStore";
import { toast } from "sonner";

export function CvVersionsSection() {
  const { versions, loading, addVersion, updateVersion, removeVersion } = useCvVersions();
  const [editing, setEditing] = useState<CvVersion | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section className="surface-card p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Files className="h-4 w-4" /> CV Versions
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Track different resume variants (e.g. "Tech V1", "Manager V2"). Tag jobs with the version you used to compare conversion rates in the A/B Lab.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New version
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">
          No CV versions yet — create one to start tagging jobs.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
          {versions.map((v) => (
            <li key={v.id} className="flex items-start justify-between gap-3 px-4 py-3 bg-card">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{v.name}</div>
                {v.notes && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{v.notes}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setEditing(v)} aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    if (!confirm(`Delete "${v.name}"? Tagged jobs will keep their data but lose the link.`)) return;
                    await removeVersion(v.id);
                    toast.success("Version deleted");
                  }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <VersionDialog
        open={creating}
        onOpenChange={setCreating}
        onSave={async (name, notes) => {
          const v = await addVersion(name, notes);
          if (v) toast.success("Version created");
        }}
      />
      <VersionDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        version={editing ?? undefined}
        onSave={async (name, notes) => {
          if (!editing) return;
          await updateVersion(editing.id, { name, notes: notes || null });
          toast.success("Saved");
        }}
      />
    </section>
  );
}

function VersionDialog({
  open, onOpenChange, version, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  version?: CvVersion;
  onSave: (name: string, notes?: string) => Promise<void>;
}) {
  const [name, setName] = useState(version?.name ?? "");
  const [notes, setNotes] = useState(version?.notes ?? "");
  const [busy, setBusy] = useState(false);

  // reset on open
  if (open && version && name === "" && notes === "" && version.name) {
    setName(version.name);
    setNotes(version.notes ?? "");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) { setName(""); setNotes(""); }
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{version ? "Edit CV version" : "New CV version"}</DialogTitle>
          <DialogDescription>Give it a label you'll recognize when tagging jobs.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cv-version-name">Name</Label>
            <Input id="cv-version-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tech Resume V1" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cv-version-notes">Notes (optional)</Label>
            <Textarea id="cv-version-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's different about this version?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(name.trim(), notes.trim() || undefined);
                onOpenChange(false);
                setName(""); setNotes("");
              } finally { setBusy(false); }
            }}
          >
            {version ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
