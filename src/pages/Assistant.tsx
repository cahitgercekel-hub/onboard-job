import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Loader2, Wand2, Languages, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Tool = "tone" | "translate" | "polish";

async function runTool(tool: Tool, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("career-assistant", {
    body: { tool, payload },
  });
  if (error) {
    // Try to parse status-specific messages
    const msg = (error as any)?.context?.error || error.message;
    throw new Error(typeof msg === "string" ? msg : "AI request failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as { content: string }).content;
}

function ResultPanel({ loading, content, empty }: { loading: boolean; content: string; empty: ReactNode }) {
  return (
    <div className="surface-card p-5 min-h-[260px]">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
        </div>
      ) : content ? (
        <article className="prose prose-sm max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      ) : (
        <div className="text-sm text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}

function ToneAnalyzer() {
  const [company, setCompany] = useState("");
  const [draft, setDraft] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!company.trim() || !draft.trim()) return toast.error("Add the company and a draft.");
    setLoading(true); setOut("");
    try { setOut(await runTool("tone", { company, draft })); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="grid gap-1.5">
          <Label htmlFor="company">Target company</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Deutsche Bank, Stripe, BMW" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="draft">Cover letter draft</Label>
          <Textarea id="draft" rows={14} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste your draft here…" />
        </div>
        <Button onClick={run} disabled={loading} className="w-full sm:w-auto">
          <Wand2 className="h-4 w-4 mr-1.5" /> Analyze tone
        </Button>
      </div>
      <ResultPanel loading={loading} content={out} empty="Output will appear here — culture inference, tone match, and concrete edits." />
    </div>
  );
}

function SkillTranslator() {
  const [experience, setExperience] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!experience.trim() || !jobDescription.trim()) return toast.error("Add both fields.");
    setLoading(true); setOut("");
    try { setOut(await runTool("translate", { experience, jobDescription })); }
    catch (e: any) { toast.error(e.message); }
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
          <Label htmlFor="jd">Target job description</Label>
          <Textarea id="jd" rows={7} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the JD here…" />
        </div>
        <Button onClick={run} disabled={loading}>
          <Briefcase className="h-4 w-4 mr-1.5" /> Translate skills
        </Button>
      </div>
      <ResultPanel loading={loading} content={out} empty="3–5 corporate-ready bullets, tailored to the JD." />
    </div>
  );
}

function PolishTool() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("English");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!text.trim()) return toast.error("Paste some text first.");
    setLoading(true); setOut("");
    try { setOut(await runTool("polish", { text, language })); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="grid gap-1.5 flex-1">
            <Label htmlFor="polish-text">Text</Label>
          </div>
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
        <Textarea id="polish-text" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste an email, CV bullet point, or message…" />
        <Button onClick={run} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-1.5" /> Polish
        </Button>
      </div>
      <ResultPanel loading={loading} content={out} empty="Polished version + a short list of key changes." />
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
