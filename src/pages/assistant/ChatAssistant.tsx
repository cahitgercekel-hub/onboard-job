import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import {
  Loader2, Send, Square, Sparkles, X, Briefcase, Bot, FileText,
  CalendarCheck, Plus, Smile, MessagesSquare, Search, ChevronUp, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/lib/jobsStore";
import { supabase } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { PremiumRail } from "@/components/assistant/PremiumRail";
import { usePlan } from "@/lib/usePlan";
import { useAuth } from "@/lib/auth";
import { loadChatThread, saveChatThread, clearChatThread, type ChatMsg } from "@/lib/chatStore";
import { useAiAccess } from "@/lib/aiAccess";

type Msg = ChatMsg;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-chat`;

const RAIL_STORAGE_KEY = "jat.premiumRail.collapsed";

export default function ChatAssistant() {
  const { t } = useTranslation();
  const { jobs } = useJobs();
  const { user } = useAuth();
  const { plan } = usePlan();
  const isPro = plan !== "free";
  const { requestAi } = useAiAccess();

  const PRIMARY_QUICK = useMemo(() => [
    { label: t("assistant.chat.quick.tailorCv"), icon: FileText, prompt: "Tailor my baseline CV to the attached job. Show the rewritten summary and 3 most-improved bullet points." },
    { label: t("assistant.chat.quick.interviewQuestions"), icon: Sparkles, prompt: "Generate 8 likely interview questions for this role, mixing behavioral and technical. For each, give a 1-line ideal-answer hint." },
    { label: t("assistant.chat.quick.mockInterview"), icon: CalendarCheck, prompt: "Run a mock interview. Ask me ONE question at a time, wait for my answer, then critique it using STAR before the next question." },
  ], [t]);

  const MORE_QUICK = useMemo(() => [
    { label: t("assistant.chat.quick.skillGaps"), prompt: "Compare my CV against the kinds of roles I've been applying to. What are my biggest skill gaps and how should I close them in the next 90 days?" },
    { label: t("assistant.chat.quick.followUp"), prompt: "Draft a polite, concise follow-up email to send a week after applying. Keep it under 120 words." },
    { label: t("assistant.chat.quick.negotiate"), prompt: "I just received an offer. Walk me through how to negotiate base salary, sign-on, and equity for this role." },
    { label: t("assistant.chat.quick.careerPivot"), prompt: "Based on my CV, what 2-3 adjacent roles could I realistically pivot into? List required skills I'd need to add for each." },
  ], [t]);

  const PREMIUM_TOOLS = useMemo(() => [
    { id: "auto-apply", icon: Bot, title: "Auto-apply Bot", desc: "Automatically apply to relevant jobs daily" },
    { id: "cv-versions", icon: FileText, title: "Unlimited CV Versions", desc: "Create and store unlimited tailored CVs" },
  ], []);

  const ATTACHED_JOB_KEY = useMemo(
    () => `jat.chat.attachedJob.${user?.id || "anon"}`,
    [user?.id],
  );

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedJobId, setAttachedJobId] = useState<string>(() => {
    try {
      return localStorage.getItem(ATTACHED_JOB_KEY) || "";
    } catch {
      return "";
    }
  });
  const [hasCv, setHasCv] = useState<boolean | null>(null);
  // The baseline CV is only sent to the AI while this is on. Off by default; remembered per user on this device.
  const SHARE_CV_KEY = `jat.chat.shareCv.${user?.id || "anon"}`;
  const [shareCv, setShareCv] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SHARE_CV_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SHARE_CV_KEY, shareCv ? "1" : "0");
    } catch {
      // ignore
    }
  }, [shareCv, SHARE_CV_KEY]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(RAIL_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_STORAGE_KEY, railCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [railCollapsed]);

  const attachedJob = useMemo(
    () => jobs.find((j) => j.id === attachedJobId) || null,
    [jobs, attachedJobId]
  );
  const jobOptions = useMemo(
    () => jobs.filter((j) => j.status !== "rejected").slice(0, 100),
    [jobs]
  );

  const userInitial = (user?.email || "U").slice(0, 1).toUpperCase();

  // ---- In-thread search ----
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const matchedIndices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const out: number[] = [];
    messages.forEach((m, i) => {
      if (m.content.toLowerCase().includes(q)) out.push(i);
    });
    return out;
  }, [messages, searchQuery]);

  // Reset / clamp the active match when matches change
  useEffect(() => {
    if (matchedIndices.length === 0) {
      setActiveMatchIdx(0);
      return;
    }
    setActiveMatchIdx((prev) => (prev >= matchedIndices.length ? 0 : prev));
  }, [matchedIndices]);

  // Scroll the active match into view
  useEffect(() => {
    if (!searchOpen || matchedIndices.length === 0) return;
    const msgIdx = matchedIndices[activeMatchIdx];
    const el = document.getElementById(`chat-msg-${msgIdx}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchIdx, matchedIndices, searchOpen]);

  // Clear search when switching threads
  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setActiveMatchIdx(0);
  }, [user?.id, attachedJobId]);

  // Focus input when opening
  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  const gotoNextMatch = () => {
    if (matchedIndices.length === 0) return;
    setActiveMatchIdx((i) => (i + 1) % matchedIndices.length);
  };
  const gotoPrevMatch = () => {
    if (matchedIndices.length === 0) return;
    setActiveMatchIdx((i) => (i - 1 + matchedIndices.length) % matchedIndices.length);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setActiveMatchIdx(0);
  };
  const matchSet = useMemo(() => new Set(matchedIndices), [matchedIndices]);
  const activeMatchMsgIdx = matchedIndices[activeMatchIdx] ?? -1;


  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cv_baseline").select("cv_text").maybeSingle();
      setHasCv(Boolean(data?.cv_text?.trim()));
    })();
  }, []);

  // Remember which job the user had attached, per user.
  useEffect(() => {
    try {
      if (attachedJobId) localStorage.setItem(ATTACHED_JOB_KEY, attachedJobId);
      else localStorage.removeItem(ATTACHED_JOB_KEY);
    } catch {
      // ignore
    }
  }, [attachedJobId, ATTACHED_JOB_KEY]);

  // Load the persisted thread for the current (user, job) pair whenever it changes.
  useEffect(() => {
    setHydrated(false);
    const stored = loadChatThread(user?.id, attachedJobId || null);
    setMessages(stored);
    // Defer marking hydrated so the save-effect below doesn't overwrite storage
    // with the previous thread on a job switch.
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, [user?.id, attachedJobId]);

  // Persist the active thread whenever it changes (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    saveChatThread(user?.id, attachedJobId || null, messages);
  }, [messages, user?.id, attachedJobId, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);


  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || isStreaming) return;
    if (!(await requestAi("chat"))) return;
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
        body: JSON.stringify({ messages: next, jobContext, includeCv: shareCv }),
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
    clearChatThread(user?.id, attachedJobId || null);
  };

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 w-full">
      <div
        className="grid gap-4 lg:gap-6 h-[calc(100vh-6.5rem)] transition-[grid-template-columns] duration-300"
        style={{
          gridTemplateColumns: railCollapsed
            ? "1fr 44px"
            : "1fr 300px",
        }}
      >
        {/* MAIN COLUMN */}
        <div className="flex flex-col surface-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-4 border-b border-border">
            <div className="flex items-center gap-4 min-w-0">
              <Logo size={64} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-semibold leading-tight truncate">{t("assistant.chat.title")}</h1>
                <p className="text-xs text-muted-foreground leading-tight truncate mt-1">{t("assistant.chat.tagline")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setSearchOpen((o) => !o)}
                disabled={messages.length === 0}
                aria-label="Search in chat"
                aria-pressed={searchOpen}
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search</span>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <MessagesSquare className="h-3.5 w-3.5" />
                    {attachedJob ? `${attachedJob.company}` : "Select a Job"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" /> Attach a job
                      </div>

                      <Select value={attachedJobId} onValueChange={setAttachedJobId}>
                        <SelectTrigger
                          className={
                            attachedJob
                              ? "h-auto w-full items-start text-left rounded-md border-accent/20 bg-accent/15 text-accent hover:bg-accent/20 px-3 py-2 [&>span]:line-clamp-none [&>span]:block [&>span]:text-left"
                              : "h-auto w-full items-start text-left px-3 py-2 [&>span]:block [&>span]:text-left"
                          }
                        >
                          <SelectValue
                            placeholder={
                              <span className="text-xs text-muted-foreground">Select a job…</span>
                            }
                          >
                            {attachedJob && (
                              <span className="block text-xs leading-snug">
                                <span className="block font-semibold truncate">{attachedJob.company}</span>
                                <span className="block text-accent/80 break-words">{attachedJob.role}</span>
                              </span>
                            )}
                          </SelectValue>
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
                    </div>
                    <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                      <div>
                        <label htmlFor="share-cv" className="text-xs font-medium">Share my CV</label>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Sends your baseline CV (without email, phone and links) with each message.
                        </p>
                      </div>
                      <Switch id="share-cv" checked={shareCv} onCheckedChange={setShareCv} />
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

          {searchOpen && (
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 border-b border-border bg-card/80">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) gotoPrevMatch();
                    else gotoNextMatch();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    closeSearch();
                  }
                }}
                placeholder="Search this conversation…"
                className="h-8 text-xs flex-1 bg-background"
              />
              <span className="text-[11px] text-muted-foreground tabular-nums min-w-[3.5rem] text-right">
                {searchQuery.trim()
                  ? matchedIndices.length
                    ? `${activeMatchIdx + 1} / ${matchedIndices.length}`
                    : "0 / 0"
                  : ""}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={gotoPrevMatch}
                disabled={matchedIndices.length === 0}
                aria-label="Previous match"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={gotoNextMatch}
                disabled={matchedIndices.length === 0}
                aria-label="Next match"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={closeSearch}
                aria-label="Close search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {hasCv === false && shareCv && (
            <div className="text-xs px-4 py-2 bg-warning/10 border-b border-warning/30 text-foreground">
              No baseline CV found. Add one in Settings so the agent knows your background.
            </div>
          )}
          {hasCv && !shareCv && (
            <div className="text-xs px-4 py-2 bg-muted/50 border-b border-border text-muted-foreground">
              Your CV is not shared with the assistant. Turn on "Share my CV" in the job menu above for CV-based answers.
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-muted/30">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-12">
                <div className="h-14 w-14 rounded-full bg-gradient-premium flex items-center justify-center shadow-md">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="text-sm max-w-md text-center whitespace-pre-line">
                  Ask me anything!{"\n"}Select a job posting from the button above — or pick a quick action below to get started.
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === "user";
              const isMatch = matchSet.has(i);
              const isActive = i === activeMatchMsgIdx;
              return (
                <div
                  key={i}
                  id={`chat-msg-${i}`}
                  className={cn("flex gap-2.5 items-start scroll-mt-4", isUser ? "justify-end" : "justify-start")}
                >
                  {!isUser && (
                    <div className="h-8 w-8 rounded-full bg-gradient-premium flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl text-sm leading-relaxed shadow-sm transition-shadow",
                      isUser
                        ? "max-w-[78%] px-4 py-2.5 bg-gradient-premium text-white rounded-tr-sm"
                        : "max-w-[88%] px-5 py-4 bg-card text-foreground border border-border rounded-tl-sm",
                      isMatch && !isActive && "ring-1 ring-warning/50",
                      isActive && "ring-2 ring-warning shadow-[0_0_0_4px_hsl(var(--warning)/0.15)]"
                    )}
                  >
                    {isUser ? (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    ) : (
                      <article className="assistant-md text-[13.5px] leading-[1.65] text-foreground/90">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ node, ...props }) => (
                              <h2 className="text-base font-semibold text-foreground mt-4 mb-2 first:mt-0" {...props} />
                            ),
                            h2: ({ node, ...props }) => (
                              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2 pb-1 border-b border-border/60 first:mt-0" {...props} />
                            ),
                            h3: ({ node, ...props }) => (
                              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-accent mt-3 mb-1.5 first:mt-0" {...props} />
                            ),
                            h4: ({ node, ...props }) => (
                              <h5 className="text-[13px] font-semibold text-foreground mt-3 mb-1 first:mt-0" {...props} />
                            ),
                            p: ({ node, ...props }) => (
                              <p className="my-2 first:mt-0 last:mb-0" {...props} />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong className="font-semibold text-foreground" {...props} />
                            ),
                            em: ({ node, ...props }) => (
                              <em className="text-foreground/80" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul className="my-2 ml-1 space-y-1.5 list-none" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol className="my-2 ml-5 space-y-1.5 list-decimal marker:text-accent marker:font-semibold" {...props} />
                            ),
                            li: ({ node, ordered, ...props }: any) =>
                              ordered ? (
                                <li className="pl-1 [&>p]:my-0" {...props} />
                              ) : (
                                <li className="relative pl-5 [&>p]:my-0 before:content-[''] before:absolute before:left-1 before:top-[0.55rem] before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent/70" {...props} />
                              ),
                            blockquote: ({ node, ...props }) => (
                              <blockquote
                                className="my-3 border-l-2 border-accent/60 bg-accent/5 px-3 py-2 rounded-r text-foreground/90 [&>p]:my-1"
                                {...props}
                              />
                            ),
                            code: ({ node, inline, className, children, ...props }: any) =>
                              inline ? (
                                <code
                                  className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[12.5px] font-mono border border-border/60"
                                  {...props}
                                >
                                  {children}
                                </code>
                              ) : (
                                <code className={cn("font-mono text-[12.5px]", className)} {...props}>
                                  {children}
                                </code>
                              ),
                            pre: ({ node, ...props }) => (
                              <pre
                                className="my-3 p-3 rounded-md bg-muted/70 border border-border overflow-x-auto text-[12.5px]"
                                {...props}
                              />
                            ),
                            a: ({ node, ...props }) => (
                              <a
                                className="text-accent underline underline-offset-2 hover:text-accent/80"
                                target="_blank"
                                rel="noreferrer"
                                {...props}
                              />
                            ),
                            hr: () => <hr className="my-4 border-border" />,
                            table: ({ node, ...props }) => (
                              <div className="my-3 overflow-x-auto rounded-md border border-border">
                                <table className="w-full text-[12.5px] border-collapse" {...props} />
                              </div>
                            ),
                            thead: ({ node, ...props }) => (
                              <thead className="bg-muted/60" {...props} />
                            ),
                            th: ({ node, ...props }) => (
                              <th className="text-left font-semibold px-3 py-2 border-b border-border" {...props} />
                            ),
                            td: ({ node, ...props }) => (
                              <td className="px-3 py-2 border-b border-border/60 align-top" {...props} />
                            ),
                          }}
                        >
                          {m.content || "…"}
                        </ReactMarkdown>
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
        <PremiumRail
          tools={PREMIUM_TOOLS}
          collapsed={railCollapsed}
          onToggle={() => setRailCollapsed((c) => !c)}
        />
      </div>
    </div>
  );
}
