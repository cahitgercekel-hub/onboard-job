import { useRef, useState } from "react";
import { Upload, FileWarning, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { previewCsvImport, importJobs, type ImportPreview } from "@/lib/jobsStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ImportCsvDialog({ open, onOpenChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const reset = () => { setPreview(null); setFileName(""); if (inputRef.current) inputRef.current.value = ""; };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    setPreview(previewCsvImport(text));
  };

  const onCommit = () => {
    if (!preview) return;
    const n = importJobs(preview.rows);
    toast.success(`Imported ${n} job${n === 1 ? "" : "s"}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-accent" /> Import jobs from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV using the same column format as the export. Review parsed rows below before importing.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div
            className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm">Click or drop a .csv file here</p>
            <p className="text-xs text-muted-foreground mt-1">
              Required columns: Company, Role, Status, Application Type, Industry, Work Model, Location, Date Applied, URL, Notes, Job Description
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm text-muted-foreground truncate">{fileName}</div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  {preview.validCount} valid
                </Badge>
                {preview.invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <FileWarning className="h-3 w-3" />
                    {preview.invalidCount} skipped
                  </Badge>
                )}
                <Button size="sm" variant="ghost" onClick={reset}>Choose different file</Button>
              </div>
            </div>

            {preview.headerErrors.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" /> Cannot import
                </div>
                <ul className="list-disc list-inside text-destructive/90 text-xs">
                  {preview.headerErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {preview.rows.length > 0 && (
              <ScrollArea className="h-[360px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Work model</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((r) => {
                      const invalid = r.errors.length > 0;
                      return (
                        <TableRow key={r.rowNumber} className={cn(invalid && "bg-destructive/5")}>
                          <TableCell className="text-xs text-muted-foreground">{r.rowNumber}</TableCell>
                          <TableCell className="font-medium">{r.job.company || <span className="text-destructive">—</span>}</TableCell>
                          <TableCell>{r.job.role || <span className="text-destructive">—</span>}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{r.job.status}</Badge></TableCell>
                          <TableCell className="text-sm">{r.job.workModel ?? "—"}</TableCell>
                          <TableCell className="text-sm">{r.job.location ?? "—"}</TableCell>
                          <TableCell className="text-xs">
                            {r.errors.map((e, i) => (
                              <div key={`e${i}`} className="text-destructive">• {e}</div>
                            ))}
                            {r.warnings.map((w, i) => (
                              <div key={`w${i}`} className="text-amber-600 dark:text-amber-400">• {w}</div>
                            ))}
                            {r.errors.length === 0 && r.warnings.length === 0 && (
                              <span className="text-muted-foreground">OK</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onCommit}
            disabled={!preview || preview.validCount === 0 || preview.headerErrors.length > 0}
          >
            Import {preview?.validCount ?? 0} job{preview?.validCount === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
