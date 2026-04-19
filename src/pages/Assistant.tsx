import { useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Loader2, Wand2, Languages, Briefcase, Upload, AlertTriangle, Gauge, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/lib/fileExtract";
import { cn } from "@/lib/utils";

type Tool = "tone" | "translate" | "polish";

interface ToneResult {
  culture: string;
  toneVerdict: string;
  toneScore: number;
  toneReasoning: string;
  issues: string[];
  edits: { before: string; after: string; reason: string }[];
}

interface PolishResult {
  polished: string;
  changes: string[];
}

async function runStructured<T>(tool: Tool, payload: Record<string, unknown>): Promise<T | string> {
  const { data, error } = await supabase.functions.invoke("career-assistant", {
    body: { tool, payload },
  });
  if (error) {
    const msg = (error as any)?.context?.error || error.message;
    throw new Error(typeof msg === "string" ? msg : "AI request failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  if ((data as any)?.structured) return (data as any).structured as T;
  return (data as { content: string }).content;
}

/* ------------------------------- File Upload ------------------------------ */

function FileUploadButton({
  onText,
  disabled,
  label = "Upload PDF / DOCX",
}: {
  onText: (text: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) throw new Error("Could not read any text from that file.");
      onText(text);
      setFileName(file.name);
      toast.success(`Loaded ${file.name}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to read file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {label}
      </Button>
      {fileName && (
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1 max-w-[200px] truncate">
          <FileText className="h-3 w-3" /> {fileName}
        </span>
      )}
    </div>
  );
}

/* -------------------------- Generic markdown panel ------------------------ */

function ResultPanel({ loading, content, empty }: { loading: boolean; content: string; empty: ReactNode }) {
  return (
    <div className="surface-card p-5 min-h-[260px]">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
        </div>
      ) : content ? (
        <article className="prose prose-sm max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-ul:list-disc prose-ul:pl-5 marker:text-accent">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      ) : (
        <div className="text-sm text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}

/* -------------------------------- Tone tab -------------------------------- */

function scoreTone(s: number): { label: string; ring: string; bg: string; fg: string } {
  if (s >= 8) return { label: "Strong", ring: "ring-success/40", bg: "bg-success/10", fg: "text-success" };
  if (s >= 5) return { label: "Partial", ring: "ring-warning/40", bg: "bg-warning/15", fg: "text-warning-foreground" };
  return { label: "Weak", ring: "ring-destructive/40", bg: "bg-destructive/10", fg: "text-destructive" };
}

function ToneAnalyzer() {
  const [company, setCompany] = useState("");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<ToneResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!company.trim() || !draft.trim()) return toast.error("Add the company and a draft.");
    setLoading(true); setResult(null);
    try {
      const r = await runStructured<ToneResult>("tone", { company, draft });
      if (typeof r === "string") throw new Error("Unexpected response format");
      setResult(r);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const tone = result ? scoreTone(result.toneScore) : null;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="grid gap-1.5">
          <Label htmlFor="company">Target company</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Deutsche Bank, Stripe, BMW" />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="draft">Cover letter draft</Label>
            <FileUploadButton onText={setDraft} disabled={loading} label="Upload cover letter" />
          </div>
          <Textarea id="draft" rows={14} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste your draft here, or upload a PDF/DOCX…" />
        </div>
        <Button onClick={run} disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Analyze tone
        </Button>
      </div>

      <div className="min-h-[260px]">
        {loading ? (
          <div className="surface-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        ) : !result ? (
          <div className="surface-card p-5 text-sm text-muted-foreground min-h-[260px]">
            Output will appear here — culture inference, tone match, issues, and concrete before/after edits.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="surface-card p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Inferred Culture
                </div>
                <p className="mt-2 text-sm text-foreground/90 leading-relaxed">{result.culture}</p>
              </div>
              <div className={cn("surface-card p-4 ring-1", tone!.ring)}>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> Tone Match
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className={cn("flex items-center justify-center h-14 w-14 rounded-full font-bold text-lg", tone!.bg, tone!.fg)}>
                    {result.toneScore}/10
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{result.toneVerdict}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{result.toneReasoning}</div>
                  </div>
                </div>
              </div>
            </div>

            {result.issues.length > 0 && (
              <div className="surface-card p-4 border-warning/40 bg-warning/5">
                <div className="text-[11px] font-medium uppercase tracking-wider text-warning-foreground/80 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Issues ({result.issues.length})
                </div>
                <ul className="mt-2 space-y-1.5">
                  {result.issues.map((it, i) => (
                    <li key={i} className="text-sm text-foreground/90 flex gap-2">
                      <span className="text-warning-foreground/70 mt-0.5">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.edits.length > 0 && (
              <div className="space-y-3">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Suggested Edits ({result.edits.length})
                </div>
                {result.edits.map((e, i) => (
                  <div key={i} className="surface-card overflow-hidden">
                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                      <div className="p-3 bg-destructive/5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-destructive/80 mb-1">Before</div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{e.before}</p>
                      </div>
                      <div className="p-3 bg-success/5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-success mb-1">After</div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{e.after}</p>
                      </div>
                    </div>
                    <div className="px-3 py-2 border-t border-border bg-muted/40 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">Why:</span> {e.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Skill Translator --------------------------- */

function SkillTranslator() {
  const [experience, setExperience] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!experience.trim() || !jobDescription.trim()) return toast.error("Add both fields.");
    setLoading(true); setOut("");
    try {
      const r = await runStructured<never>("translate", { experience, jobDescription });
      if (typeof r === "string") setOut(r);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="grid gap-1.5">
          <Label htmlFor="exp">Unconventional experience</Label>
          <Textarea id="exp" rows={7} value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. Led a 30-person volunteer cleanup, coordinated logistics across 5 districts…" />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="jd">Target job description</Label>
            <FileUploadButton onText={setJobDescription} disabled={loading} label="Upload JD" />
          </div>
          <Textarea id="jd" rows={7} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the JD here, or upload a PDF/DOCX…" />
        </div>
        <Button onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
          Translate skills
        </Button>
      </div>
      <ResultPanel loading={loading} content={out} empty="3–5 corporate-ready bullets, tailored to the JD." />
    </div>
  );
}

/* --------------------------------- Polish --------------------------------- */

function PolishTool() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("English");
  const [result, setResult] = useState<PolishResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!text.trim()) return toast.error("Paste some text first.");
    setLoading(true); setResult(null);
    try {
      const r = await runStructured<PolishResult>("polish", { text, language });
      if (typeof r === "string") throw new Error("Unexpected response format");
      setResult(r);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="grid gap-1.5 flex-1">
            <Label htmlFor="polish-text">Text</Label>
          </div>
          <FileUploadButton onText={setText} disabled={loading} label="Upload file" />
          <div className="grid gap-1.5 w-40">
            <Label className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" /> Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="German">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Textarea id="polish-text" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste an email, CV bullet point, or message — or upload a PDF/DOCX…" />
        <Button onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Polish
        </Button>
      </div>

      <div className="min-h-[260px]">
        {loading ? (
          <div className="surface-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        ) : !result ? (
          <div className="surface-card p-5 text-sm text-muted-foreground min-h-[260px]">
            Polished version + a short list of key changes will appear here.
          </div>
        ) : (
          <div className="grid xl:grid-cols-5 gap-4">
            <div className="xl:col-span-3 surface-card p-5 shadow-md ring-1 ring-accent/30 bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-accent/15 text-accent border-accent/20">
                  <Sparkles className="h-3 w-3" /> Polished Version
                </Badge>
              </div>
              <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {result.polished}
              </div>
            </div>
            <div className="xl:col-span-2 surface-card p-5 bg-muted/40">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Key Changes ({result.changes.length})
              </div>
              <ul className="space-y-2">
                {result.changes.map((c, i) => (
                  <li key={i} className="text-sm text-foreground/90 flex gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Assistant() {
  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" /> AI Career Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Refine your application materials with AI-powered tone, translation, and polish tools.
        </p>
      </div>

      <Tabs defaultValue="tone" className="w-full">
        <TabsList className="mb-5">
          <TabsTrigger value="tone">Corporate Tone</TabsTrigger>
          <TabsTrigger value="translate">Skill Translator</TabsTrigger>
          <TabsTrigger value="polish">Grammar & Polish</TabsTrigger>
        </TabsList>
        <TabsContent value="tone"><ToneAnalyzer /></TabsContent>
        <TabsContent value="translate"><SkillTranslator /></TabsContent>
        <TabsContent value="polish"><PolishTool /></TabsContent>
      </Tabs>
    </div>
  );
}
