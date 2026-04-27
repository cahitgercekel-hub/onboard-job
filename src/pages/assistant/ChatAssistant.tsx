import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, MessageSquare, Send, Square, Sparkles, X, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/lib/jobsStore";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AssistantPageHeader } from "@/components/assistant/AssistantPageHeader";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  { label: "Review my CV", prompt: "Please review my baseline CV. Call out the 3 strongest points and the 3 weakest, with concrete fixes." },
  { label: "Mock interview me", prompt: "Run a mock interview. Ask me ONE question at a time. After my answer, give a short STAR-based critique, then ask the next question." },
  { label: "Find my skill gaps", prompt: "Compare my CV against the kinds of roles I've been applying to. What are my biggest skill gaps and how should I close them in the next 90 days?" },
  { label: "Draft a follow-up email", prompt: "Draft a polite, concise follow-up email to send a week after applying. Keep it under 120 words." },
  { label: "Negotiate this offer", prompt: "I just received an offer. Walk me through how to negotiate base salary, sign-on, and equity for this role." },
  { label: "Suggest a career pivot", prompt: "Based on my CV, what 2-3 adjacent roles could I realistically pivot into? List required skills I'd need to add for each." },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-chat`;

export default function ChatAssistant() {
  const { jobs } = useJobs();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedJobId, setAttachedJobId] = useState<string>("");
  const [hasCv, setHasCv] = useState<boolean | null>(null);
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

  // Check baseline CV existence once
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cv_baseline").select("cv_text").maybeSingle();
      setHasCv(Boolean(data?.cv_text?.trim()));
    })();
  }, []);

  // Auto-scroll on new content
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
            fitness_score: attachedJob.fitness_score,
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
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
      <AssistantPageHeader
        icon={<MessageSquare className="h-5 w-5 text-accent" />}
        title="Career Chat"
        subtitle="Your personal career strategist. Attach a job for tailored answers — your baseline CV is used automatically."
      />

      {/* Job context bar */}
      <div className="surface-card p-3 mb-3 flex flex-wrap items-center gap-2">
        <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">Talking about:</span>
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
            <SelectTrigger className="h-8 w-[260px] text-xs">
              <SelectValue placeholder="Attach a job (optional)" />
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
        <div className="flex-1" />
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-7">
            New chat
          </Button>
        )}
      </div>

      {hasCv === false && (
        <div className="mb-3 text-xs px-3 py-2 rounded-md bg-warning/10 border border-warning/30 text-foreground">
          No baseline CV found. Add one in Settings so the agent knows your background.
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto surface-card p-4 mb-3 space-y-4 min-h-[300px]"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-8">
            <Sparkles className="h-8 w-8 text-accent/60" />
            <div className="text-sm max-w-md">
              Ask me anything about your job search — or pick a quick action below to get started.
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {m.role === "assistant" ? (
                <article className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </article>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2.5 text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => send(q.prompt)}
            disabled={isStreaming}
            className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-card hover:bg-accent/10 hover:border-accent/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 items-end"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask anything… (Shift+Enter for newline)"
          rows={2}
          className="resize-none min-h-[52px]"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button type="button" onClick={stop} variant="outline" size="icon" className="h-[52px] w-[52px] shrink-0">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={!input.trim()} size="icon" className="h-[52px] w-[52px] shrink-0" variant="ai">
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
