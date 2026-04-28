import { useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import {
  Sparkles, Loader2, Wand2, Languages, Briefcase, Upload, AlertTriangle, Gauge, FileText,
  MessageSquare, Target, ListChecks, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/lib/fileExtract";
import { useJobs } from "@/lib/jobsStore";
import { cn } from "@/lib/utils";
import { usePlan } from "@/lib/usePlan";

type Tool = "tone" | "translate" | "polish" | "interview" | "cv";

interface ToneResult { culture: string; toneVerdict: string; toneScore: number; toneReasoning: string; issues: string[]; edits: { before: string; after: string; reason: string }[]; }
interface PolishResult { polished: string; changes: string[]; }
interface InterviewResult { questions: { question: string; situation: string; task: string; action: string; result: string }[]; }
interface CvAiResult { scores: { language: number; formatting: number; ats: number; keywords: number }; tips: string[]; strongKeywords: string[]; }

async function runStructured<T>(tool: Tool, payload: Record<string, unknown>): Promise<T | string> {
  const { data, error } = await supabase.functions.invoke("career-assistant", { body: { tool, payload } });
  if (error) {
    const msg = (error as any)?.context?.error || error.message;
    throw new Error(typeof msg === "string" ? msg : "AI request failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  if ((data as any)?.structured) return (data as any).structured as T;
  return (data as { content: string }).content;
}

/* ------------------------------- File Upload ------------------------------ */

function FileUploadButton({ onText, disabled, label = "Upload PDF / DOCX" }: { onText: (text: string) => void; disabled?: boolean; label?: string }) {
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
    } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden" onChange={onChange} />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled || busy}>
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

function ResultPanel({ loading, content, empty }: { loading: boolean; content: string; empty: ReactNode }) {
  return (
    <div className="surface-card p-5 min-h-[260px]">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
        </div>
      ) : content ? (
        <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-ul:list-disc prose-ul:pl-5 marker:text-accent">
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

export function ToneAnalyzer() {
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
    <div className="grid lg:grid-cols-2 gap-5 min-h-[560px]">
      <div className="flex flex-col gap-3 h-full">
        <div className="grid gap-1.5">
          <Label htmlFor="company">Target company</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Deutsche Bank, Stripe, BMW" />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-h-[200px]">
          <div className="flex items-center justify-between">
            <Label htmlFor="draft">Cover letter draft</Label>
            <FileUploadButton onText={setDraft} disabled={loading} label="Upload cover letter" />
          </div>
          <Textarea id="draft" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste your draft here, or upload a PDF/DOCX…" className="flex-1 min-h-[200px] resize-none" />
        </div>
        <Button onClick={run} disabled={loading} className="mt-auto w-full sm:w-auto bg-gradient-premium text-white border-0 hover:opacity-95">
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
                      <span className="text-warning-foreground/70 mt-0.5">•</span><span>{it}</span>
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

export function SkillTranslator() {
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
    <div className="grid lg:grid-cols-2 gap-5 min-h-[560px]">
      <div className="flex flex-col gap-3 h-full">
        <div className="flex flex-col gap-1.5 flex-1 min-h-[140px]">
          <Label htmlFor="exp">Unconventional experience</Label>
          <Textarea id="exp" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. Led a 30-person volunteer cleanup, coordinated logistics across 5 districts…" className="flex-1 min-h-[140px] resize-none" />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-h-[140px]">
          <div className="flex items-center justify-between">
            <Label htmlFor="jd">Target job description</Label>
            <FileUploadButton onText={setJobDescription} disabled={loading} label="Upload JD" />
          </div>
          <Textarea id="jd" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the JD here, or upload a PDF/DOCX…" className="flex-1 min-h-[140px] resize-none" />
        </div>
        <Button onClick={run} disabled={loading} className="mt-auto w-full sm:w-auto bg-gradient-premium text-white border-0 hover:opacity-95">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
          Translate skills
        </Button>
      </div>
      <ResultPanel loading={loading} content={out} empty="3–5 corporate-ready bullets, tailored to the JD." />
    </div>
  );
}

/* --------------------------------- Polish --------------------------------- */

export function PolishTool() {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("English");
  const [businessGerman, setBusinessGerman] = useState(false);
  const [result, setResult] = useState<PolishResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!text.trim()) return toast.error("Paste some text first.");
    setLoading(true); setResult(null);
    try {
      const r = await runStructured<PolishResult>("polish", { text, language, businessGerman });
      if (typeof r === "string") throw new Error("Unexpected response format");
      setResult(r);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5 min-h-[560px]">
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <Label htmlFor="polish-text" className="mb-0">Text</Label>
          <div className="flex items-end gap-2 ml-auto">
            <FileUploadButton onText={setText} disabled={loading} label="Upload file" />
            <div className="grid gap-1.5 w-36">
              <Label className="flex items-center gap-1 text-xs"><Languages className="h-3.5 w-3.5" /> Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {language === "German" && (
          <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/5 border border-accent/30 cursor-pointer">
            <Checkbox
              checked={businessGerman}
              onCheckedChange={(v) => setBusinessGerman(Boolean(v))}
              id="biz-de"
            />
            <span className="text-sm text-foreground">{t("assistant.polish.businessGerman")}</span>
          </label>
        )}
        <Textarea id="polish-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste an email, CV bullet point, or message — or upload a PDF/DOCX…" className="flex-1 min-h-[240px] resize-none" />
        <Button onClick={run} disabled={loading} className="mt-auto w-full sm:w-auto bg-gradient-premium text-white border-0 hover:opacity-95">
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
              <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{result.polished}</div>
            </div>
            <div className="xl:col-span-2 surface-card p-5 bg-muted/40">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Key Changes ({result.changes.length})
              </div>
              <ul className="space-y-2">
                {result.changes.map((c, i) => (
                  <li key={i} className="text-sm text-foreground/90 flex gap-2">
                    <span className="text-accent mt-0.5">•</span><span>{c}</span>
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

/* -------------------------------- Interview ------------------------------- */

export function InterviewPrep() {
  const { t } = useTranslation();
  const { jobs } = useJobs();
  const interviewJobs = useMemo(() => jobs.filter((j) => j.status === "interviewing"), [jobs]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const job = interviewJobs.find((j) => j.id === selectedId);
    if (!job) return toast.error("Select a job first.");
    setLoading(true); setResult(null);
    try {
      const r = await runStructured<InterviewResult>("interview", {
        company: job.company, role: job.role,
        jobDescription: job.jobDescription, notes: job.notes,
      });
      if (typeof r === "string") throw new Error("Unexpected response format");
      setResult(r);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5 min-h-[560px]">
      {/* LEFT — picker + button */}
      <div className="flex flex-col gap-3 h-full">
        <div className="grid gap-1.5">
          <Label className="text-xs">{t("assistant.interview.pickJob")}</Label>
          {interviewJobs.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md px-3 py-3">
              {t("assistant.interview.noJobs")}
            </div>
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Select a role…" /></SelectTrigger>
              <SelectContent>
                {interviewJobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.role} — {j.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={run} disabled={loading || !selectedId} className="mt-auto w-full sm:w-auto bg-gradient-premium text-white border-0 hover:opacity-95">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          {t("assistant.interview.generate")}
        </Button>
      </div>

      {/* RIGHT — results / placeholder */}
      <div className="min-h-[260px]">
        {!result && !loading && (
          <div className="surface-card p-6 text-sm text-muted-foreground min-h-[260px] flex items-center justify-center text-center">
            {t("assistant.interview.empty")}
          </div>
        )}
        {loading && (
          <div className="surface-card p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}
        {result && (
          <div className="grid gap-4">
          {result.questions.map((q, i) => (
            <div key={i} className="surface-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-accent/15 text-accent border-accent/20">Q{i + 1}</Badge>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("assistant.interview.question")}</span>
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed mb-3">{q.question}</p>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{t("assistant.interview.answer")}</div>
              <div className="space-y-1.5 text-sm">
                {[
                  { k: "S", label: "Situation", v: q.situation },
                  { k: "T", label: "Task", v: q.task },
                  { k: "A", label: "Action", v: q.action },
                  { k: "R", label: "Result", v: q.result },
                ].map((s) => (
                  <div key={s.k} className="flex gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/15 text-accent text-[10px] font-bold">{s.k}</span>
                    <span className="text-foreground/85"><span className="font-medium text-foreground">{s.label}:</span> {s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- CV ----------------------------------- */

function ringColorClass(score: number) {
  if (score >= 80) return "stroke-success text-success";
  if (score >= 60) return "stroke-warning-foreground text-warning-foreground";
  return "stroke-destructive text-destructive";
}

function ScoreGauge({ label, score }: { label: string; score: number }) {
  const c = ringColorClass(score);
  const pct = Math.max(0, Math.min(100, score));
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="surface-card p-4">
      <div className="text-sm font-semibold mb-2">{label}</div>
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
            <circle cx="32" cy="32" r={r} className="stroke-muted" strokeWidth="6" fill="none" />
            <circle
              cx="32" cy="32" r={r}
              className={cn(c, "transition-all")}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
            />
          </svg>
          <div className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums", c)}>
            {pct}%
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-2xl font-bold tabular-nums leading-none", c)}>{pct}</div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full", pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning-foreground" : "bg-destructive")} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">{pct} / 100</div>
        </div>
      </div>
    </div>
  );
}

function ruleCheckCv(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const hasEmail = /\S+@\S+\.\S+/.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{7,})/.test(text);
  const fancyChars = (text.match(/[│■◆●★✦✓→]/g) || []).length;
  const lines = text.split(/\r?\n/);
  const longLines = lines.filter((l) => l.length > 200).length;

  let lengthScore = 100;
  if (words < 200) lengthScore = 40;
  else if (words < 350) lengthScore = 70;
  else if (words > 1200) lengthScore = 55;
  else if (words > 900) lengthScore = 80;

  let atsScore = 100;
  if (fancyChars > 5) atsScore -= 25;
  if (longLines > 3) atsScore -= 10;
  if (!hasEmail) atsScore -= 20;
  if (!hasPhone) atsScore -= 10;
  atsScore = Math.max(20, atsScore);

  return { words, hasEmail, hasPhone, fancyChars, lengthScore, atsScore };
}

function combineScores(ai: CvAiResult["scores"], rules: ReturnType<typeof ruleCheckCv>) {
  return {
    language: ai.language,
    formatting: Math.round((ai.formatting + rules.lengthScore) / 2),
    ats: Math.round((ai.ats + rules.atsScore) / 2),
    keywords: ai.keywords,
  };
}

// Daily scan tracking (local, free-tier only)
const SCAN_LIMIT = 3;
function getTodayKey() {
  const d = new Date();
  return `jat.cvscan.${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}
function readScanCount() {
  try { return parseInt(localStorage.getItem(getTodayKey()) || "0", 10) || 0; } catch { return 0; }
}
function bumpScanCount() {
  try { const k = getTodayKey(); localStorage.setItem(k, String(readScanCount() + 1)); } catch { /* noop */ }
}

export function CvAnalyzer() {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<CvAiResult | null>(null);
  const [scansUsed, setScansUsed] = useState(0);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const { plan } = usePlan();
  const isPro = plan !== "free";

  useMemo(() => setScansUsed(readScanCount()), []);

  const rules = useMemo(() => (text.trim() ? ruleCheckCv(text) : null), [text]);
  const finalScores = useMemo(() => (aiResult && rules ? combineScores(aiResult.scores, rules) : null), [aiResult, rules]);

  const limitReached = !isPro && scansUsed >= SCAN_LIMIT;

  const run = async () => {
    if (!text.trim()) return toast.error("Paste or upload your CV first.");
    if (limitReached) return toast.error("Daily scan limit reached. Upgrade to Pro for unlimited scans.");
    setLoading(true); setAiResult(null);
    try {
      const r = await runStructured<CvAiResult>("cv", { cv: text });
      if (typeof r === "string") throw new Error("Unexpected response format");
      setAiResult(r);
      if (!isPro) { bumpScanCount(); setScansUsed(readScanCount()); }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleFile = async (file: File) => {
    try {
      const txt = await extractTextFromFile(file);
      if (!txt.trim()) throw new Error("Could not read any text from that file.");
      setText(txt);
      toast.success(`Loaded ${file.name}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to read file");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const extraTips: string[] = [];
  if (rules) {
    if (!rules.hasEmail) extraTips.push("Add an email address to your contact section.");
    if (!rules.hasPhone) extraTips.push("Add a phone number to your contact section.");
    if (rules.fancyChars > 5) extraTips.push("Replace decorative bullet characters with plain '-' or '•' for better ATS parsing.");
    if (rules.words < 350) extraTips.push(`Your CV is short (${rules.words} words). Aim for 350-900.`);
    if (rules.words > 1200) extraTips.push(`Your CV is long (${rules.words} words). Trim to under 1200 for impact.`);
  }

  const scanPct = Math.min(100, Math.round((scansUsed / SCAN_LIMIT) * 100));

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* LEFT — Input */}
      <div className="space-y-4">
        <div className="surface-card p-4">
          <Label htmlFor="cv-text" className="text-sm font-semibold mb-2 block">Paste CV Text</Label>
          <Textarea
            id="cv-text"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your full CV here…"
            className="resize-none"
          />
        </div>

        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "surface-card p-8 flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed transition-colors",
            dragOver ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 hover:bg-muted/30"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); }}
          />
          <Upload className="h-7 w-7 text-accent mb-2" />
          <div className="text-sm font-semibold">Upload PDF or Docx</div>
          <div className="text-xs text-muted-foreground mt-0.5">Drag & Drop or Browse Files</div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-muted-foreground">
              {isPro ? (
                <span className="inline-flex items-center gap-1 text-premium font-medium">
                  <Sparkles className="h-3 w-3" /> Unlimited scans
                </span>
              ) : (
                `Daily Scan Limit: ${scansUsed}/${SCAN_LIMIT} free scans used`
              )}
            </span>
            {!isPro && <span className="font-medium">{scanPct}%</span>}
          </div>
          {!isPro && <Progress value={scanPct} className="h-1.5" />}
          {limitReached && (
            <p className="text-[11px] text-destructive mt-2">
              Daily limit reached. <a href="/billing" className="underline font-medium">Upgrade to Pro</a> for unlimited scans.
            </p>
          )}
        </div>

        <Button
          onClick={run}
          disabled={loading || limitReached}
          className="w-full h-11 text-sm font-semibold bg-gradient-premium text-white border-0 hover:opacity-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
          Analyze CV
        </Button>
      </div>

      {/* RIGHT — Results */}
      <div className="space-y-4">
        {!aiResult && !loading && (
          <div className="surface-card p-8 text-sm text-muted-foreground min-h-[260px] flex items-center justify-center text-center">
            Paste or upload your CV, then run the analyzer to see scores, keywords, and personalized tips.
          </div>
        )}
        {loading && (
          <div className="surface-card p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
          </div>
        )}
        {aiResult && finalScores && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <ScoreGauge label="Professional Language" score={finalScores.language} />
              <ScoreGauge label="Length & Formatting" score={finalScores.formatting} />
              <ScoreGauge label="ATS Appropriateness" score={finalScores.ats} />
              <ScoreGauge label="Keyword Optimization" score={finalScores.keywords} />
            </div>

            {aiResult.strongKeywords.length > 0 && (
              <div className="surface-card p-4">
                <div className="text-sm font-semibold mb-2">Strong Keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.strongKeywords.map((k) => (
                    <Badge key={k} variant="outline" className="bg-success/10 text-success border-success/30">{k}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="surface-card p-4">
              <div className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-accent" /> Actionable Tips
              </div>
              <ul className="space-y-2">
                {[...extraTips, ...aiResult.tips].map((tip, i) => (
                  <li key={i} className="text-sm text-foreground/90 flex gap-2">
                    <span className="text-accent mt-0.5">•</span><span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium ATS Simulation */}
            <div className="surface-card p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Detailed ATS Simulation</div>
                <Badge className="bg-gradient-premium text-white border-0 gap-1">
                  <Sparkles className="h-3 w-3" /> Premium
                </Badge>
              </div>
              {isPro ? (
                <div className="text-sm text-muted-foreground">
                  Detailed ATS report unlocks deeper keyword scoring, recruiter-readability heuristics,
                  and per-section feedback. Re-run the analyzer to refresh.
                </div>
              ) : (
                <div className="relative">
                  <div className="space-y-2 select-none pointer-events-none blur-sm" aria-hidden="true">
                    <div className="text-xs font-semibold">Detailed ATS Report</div>
                    <ul className="text-xs space-y-1 text-foreground/80 list-disc pl-5">
                      <li>Agile Methodologies — React Native: Lorem ipsum dolor sit amet…</li>
                      <li>Cross-functional leadership and stakeholder management benchmarks…</li>
                      <li>Section-by-section ATS parser simulation with extracted entities…</li>
                      <li>Recruiter scan-path heatmap and 6-second readability score…</li>
                      <li>Keyword density alignment vs. top 10 listings in your role…</li>
                    </ul>
                  </div>
                  <div className="absolute inset-0 flex items-end justify-center pb-2">
                    <a href="/billing">
                      <Button className="bg-gradient-premium text-white border-0 hover:opacity-95 gap-2 shadow-lg">
                        <Lock className="h-4 w-4" /> Unlock with Pro
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */
// The legacy /assistant tabbed page has been split into per-tool routes.
// This default export now just redirects to the Career Chat landing page.
import { Navigate } from "react-router-dom";

export default function Assistant() {
  return <Navigate to="/assistant/chat" replace />;
}

