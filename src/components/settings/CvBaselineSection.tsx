import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { extractTextFromFile } from "@/lib/fileExtract";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CvRow {
  cv_text: string | null;
  file_path: string | null;
  file_name: string | null;
  updated_at: string;
}

export function CvBaselineSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cv, setCv] = useState<CvRow | null>(null);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("cv_baseline")
        .select("cv_text, file_path, file_name, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.error(error);
      if (data) {
        setCv(data as CvRow);
        setText(data.cv_text ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB");
      return;
    }
    setBusy(true);
    try {
      const extracted = await extractTextFromFile(file);
      if (!extracted.trim()) throw new Error("Couldn't extract text from this file");

      // Upload file (replace existing if any)
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/cv-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      // Remove previous file if present
      if (cv?.file_path && cv.file_path !== path) {
        await supabase.storage.from("cvs").remove([cv.file_path]);
      }

      const { error: dbErr } = await supabase
        .from("cv_baseline")
        .upsert(
          { user_id: user.id, cv_text: extracted, file_path: path, file_name: file.name },
          { onConflict: "user_id" }
        );
      if (dbErr) throw dbErr;

      setCv({ cv_text: extracted, file_path: path, file_name: file.name, updated_at: new Date().toISOString() });
      setText(extracted);
      toast.success("CV uploaded and parsed");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveText = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("cv_baseline")
      .upsert({ user_id: user.id, cv_text: text }, { onConflict: "user_id" });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setCv((c) => ({ ...(c ?? { file_path: null, file_name: null }), cv_text: text, updated_at: new Date().toISOString() } as CvRow));
      toast.success("CV text saved");
    }
  };

  const removeCv = async () => {
    if (!user) return;
    setBusy(true);
    if (cv?.file_path) {
      await supabase.storage.from("cvs").remove([cv.file_path]);
    }
    const { error } = await supabase.from("cv_baseline").delete().eq("user_id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setCv(null);
      setText("");
      toast.success("CV removed");
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Baseline CV</h3>
          {cv?.file_name && (
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[260px]">{cv.file_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {cv?.file_name ? "Replace CV" : "Upload CV"}
          </Button>
          {(cv?.file_name || cv?.cv_text) && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={removeCv}
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="cv-text" className="text-xs">Extracted text (editable)</Label>
          <Textarea
            id="cv-text"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Or paste your CV / skills here…"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={saveText} disabled={busy || text === (cv?.cv_text ?? "")}>
              Save text
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
