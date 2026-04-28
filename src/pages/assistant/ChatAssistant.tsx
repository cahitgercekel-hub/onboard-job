import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  Loader2, Send, Square, Sparkles, X, Briefcase, Bot, FileText,
  CalendarCheck, Plus, Smile, MessagesSquare, Lock, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/lib/jobsStore";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { PlanBadge } from "@/components/PlanBadge";
import { usePlan } from "@/lib/usePlan";
import { useAuth } from "@/lib/auth";

type Msg = { role: "user" | "assistant"; content: string };

const PRIMARY_QUICK = [
  { label: "View Tailored CV", icon: FileText, prompt: "Tailor my baseline CV to the attached job. Show the rewritten summary and 3 most-improved bullet points." },
  { label: "Generate Interview Questions", icon: Sparkles, prompt: "Generate 8 likely interview questions for this role, mixing behavioral and technical. For each, give a 1-line ideal-answer hint." },
  { label: "Schedule Mock Interview", icon: CalendarCheck, prompt: "Run a mock interview. Ask me ONE question at a time, wait for my answer, then critique it using STAR before the next question." },
];

const MORE_QUICK = [
  { label: "Find my skill gaps", prompt: "Compare my CV against the kinds of roles I've been applying to. What are my biggest skill gaps and how should I close them in the next 90 days?" },
  { label: "Draft a follow-up email", prompt: "Draft a polite, concise follow-up email to send a week after applying. Keep it under 120 words." },
  { label: "Negotiate this offer", prompt: "I just received an offer. Walk me through how to negotiate base salary, sign-on, and equity for this role." },
  { label: "Suggest a career pivot", prompt: "Based on my CV, what 2-3 adjacent roles could I realistically pivot into? List required skills I'd need to add for each." },
];

const PREMIUM_TOOLS = [
  { id: "auto-apply", icon: Bot, title: "Auto-apply Bot", desc: "Automatically apply to relevant jobs daily" },
  { id: "cv-versions", icon: FileText, title: "Unlimited CV Versions", desc: "Create and store unlimited tailored CVs" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-chat`;

export default function ChatAssistant() {
  const { jobs } = useJobs();
  const { user } = useAuth();
  const { plan } = usePlan();
  const isPro = plan !== "free";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedJobId, setAttachedJobId] = useState<string>("");
  const [hasCv, setHasCv] = useState<boolean | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const attachedJob = useMemo(
    () => jobs.find((j) => j.id === attachedJobId) || null,
    [jobs, attachedJobId]
  );
  const jobOptions = useMemo(
    () => jobs.filter((j) => j.status !== "rejected").slice(0, 100),
    [jobs]
  );

  const userInitial = (user?.email || "U").slice(0, 1).toUpperCase();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cv_baseline").select("cv_text").maybeSingle();
      setHasCv(Boolean(data?.cv_text?.trim()));
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const jobContext = attachedJob
        ? {
            company: attachedJob.company,
            role: attachedJob.role,
            jobDescription: attachedJob.jobDescription,
            fitness_score: attachedJob.fitnessScore,
          }
        : null;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: next, jobContext }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit hit — please wait a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in Settings.");
        else {
          const j = await resp.json().catch(() => ({}));
          toast.error(j?.error || "Chat failed");
        }
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nlIdx);
          textBuffer = textBuffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        toast.error("Connection lost. Try again.");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const reset = () => {
    if (isStreaming) stop();
    setMessages([]);
  };

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 mx-auto max-w-7xl">
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 lg:gap-6 h-[calc(100vh-6rem)]">
        {/* MAIN COLUMN */}
        <div className="flex flex-col surface-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-md bg-gradient-premium flex items-center justify-center shadow-sm shrink-0">
                <Logo size={22} className="rounded" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-semibold leading-tight truncate">AI Career Assistant</h1>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">Your personal career strategist</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <MessagesSquare className="h-3.5 w-3.5" />
                    {attachedJob ? `${attachedJob.company}` : "SelectJob"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" /> Attach a job
                      </div>
                      {attachedJob ? (
                        <Badge variant="secondary" className="bg-accent/15 text-accent border-accent/20 gap-1">
                          {attachedJob.company} — {attachedJob.role}
                          <button
                            onClick={() => setAttachedJobId("")}
                            className="ml-1 hover:bg-background/50 rounded p-0.5"
                            aria-label="Remove job"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : (
                        <Select value={attachedJobId} onValueChange={setAttachedJobId}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select a job (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {jobOptions.length === 0 ? (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">No saved jobs yet</div>
                            ) : (
                              jobOptions.map((j) => (
                                <SelectItem key={j.id} value={j.id}>
                                  {j.company} — {j.role}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {messages.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={reset} className="w-full h-8 text-xs">
                        Start new chat
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {hasCv === false && (
            <div className="text-xs px-4 py-2 bg-warning/10 border-b border-warning/30 text-foreground">
              No baseline CV found. Add one in Settings so the agent knows your background.
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-muted/30">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-12">
                <div className="h-14 w-14 rounded-full bg-gradient-premium flex items-center justify-center shadow-md">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="text-sm max-w-md">
                  Ask me anything about your job search — or pick a quick action below to get started.
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={cn("flex gap-2.5 items-start", isUser ? "justify-end" : "justify-start")}>
                  {!isUser && (
                    <div className="h-8 w-8 rounded-full bg-gradient-premium flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                      isUser
                        ? "bg-gradient-premium text-white rounded-tr-sm"
                        : "bg-card text-foreground border border-border rounded-tl-sm"
                    )}
                  >
                    {isUser ? (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    ) : (
                      <article className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
                        <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                      </article>
                    )}
                  </div>
                  {isUser && (
                    <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">
                      {userInitial}
                    </div>
                  )}
                </div>
              );
            })}

            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5 items-start">
                <div className="h-8 w-8 rounded-full bg-gradient-premium flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Quick chips + composer */}
          <div className="px-3 md:px-4 pt-3 pb-3 border-t border-border bg-card">
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PRIMARY_QUICK.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => send(q.prompt)}
                  disabled={isStreaming}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent/10 hover:border-accent/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  <q.icon className="h-3.5 w-3.5 text-accent" />
                  {q.label}
                </button>
              ))}
              <Popover open={moreOpen} onOpenChange={setMoreOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={isStreaming}
                    className="text-xs h-7 w-7 rounded-full border border-border bg-background hover:bg-accent/10 hover:border-accent/40 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
                    aria-label="More quick actions"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-1.5">
                  <div className="space-y-0.5">
                    {MORE_QUICK.map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => { setMoreOpen(false); send(q.prompt); }}
                        className="w-full text-left text-xs px-2.5 py-2 rounded-md hover:bg-muted transition-colors"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="relative flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask anything…"
                  rows={1}
                  className="resize-none min-h-[44px] max-h-32 rounded-full pl-4 pr-10 py-3 bg-muted/40 border-border"
                  disabled={isStreaming}
                />
                <Smile className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {isStreaming ? (
                <Button type="button" onClick={stop} variant="outline" size="icon" className="h-11 w-11 rounded-full shrink-0">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!input.trim()}
                  size="icon"
                  className="h-11 w-11 rounded-full shrink-0 bg-gradient-premium text-white border-0 hover:opacity-95 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT RAIL — Premium Tools */}
        <aside className="hidden lg:flex flex-col surface-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-gradient-premium text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 -ml-1 opacity-80" />
                <h2 className="text-sm font-semibold">Premium Tools</h2>
              </div>
              <PlanBadge plan={isPro ? plan : "pro"} />
            </div>
            <p className="text-[11px] opacity-90 mt-0.5">{isPro ? "Active features" : "Pro features"}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {PREMIUM_TOOLS.map((tool) => (
              <div key={tool.id} className="rounded-lg border border-border p-3 bg-card relative">
                {!isPro && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground absolute top-2.5 right-2.5" />
                )}
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="h-8 w-8 rounded-md bg-premium-soft flex items-center justify-center shrink-0">
                    <tool.icon className="h-4 w-4 text-premium" />
                  </div>
                  <div className="min-w-0 pr-4">
                    <div className="text-sm font-semibold leading-tight">{tool.title}</div>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tool.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <PlanBadge plan="pro" />
                  <Switch checked={isPro} disabled={!isPro} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border">
            {isPro ? (
              <Button asChild variant="outline" className="w-full">
                <Link to="/billing">Manage plan</Link>
              </Button>
            ) : (
              <Button asChild className="w-full bg-gradient-premium text-white border-0 hover:opacity-95">
                <Link to="/billing">Upgrade to Pro for Access</Link>
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
