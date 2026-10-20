import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { AI_NOTICE_VERSION } from "@/lib/legal";
import { AI_FEATURES, type AiFeature } from "@/lib/aiFeatures";
import { DEMO_AI_MESSAGE, isDemo } from "@/lib/demo/demoMode";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// Optional AI features are OFF until the user turns them on (stored in public.privacy_settings, which
// the edge functions also check). Before the first use of each tool the user sees exactly what that
// tool sends. The tracker never depends on this.

interface Ctx {
  /** null while loading or when signed out */
  aiEnabled: boolean | null;
  setAiEnabled: (enabled: boolean) => Promise<boolean>;
  /** Resolves true when the feature may run now; may show the disclosure dialog first. */
  requestAi: (feature: AiFeature) => Promise<boolean>;
}

const AiAccessContext = createContext<Ctx>({
  aiEnabled: null,
  setAiEnabled: async () => false,
  requestAi: async () => false,
});

const ackKey = (userId: string) => `jat.ai.ack.${AI_NOTICE_VERSION}.${userId}`;

function readAcks(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(ackKey(userId)) || "[]");
  } catch {
    return [];
  }
}

function addAck(userId: string, feature: AiFeature) {
  try {
    const acks = new Set(readAcks(userId));
    acks.add(feature);
    localStorage.setItem(ackKey(userId), JSON.stringify([...acks]));
  } catch {
    // Without storage the disclosure simply shows again next time.
  }
}

export function AiAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [aiEnabled, setEnabledState] = useState<boolean | null>(null);
  const [pending, setPending] = useState<AiFeature | null>(null);
  const [saving, setSaving] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    setEnabledState(null);
    if (!user) return;
    if (isDemo()) {
      setEnabledState(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("privacy_settings")
      .select("ai_enabled")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("privacy settings unavailable", error.code);
        setEnabledState(Boolean(data?.ai_enabled));
      });
    return () => { cancelled = true; };
  }, [user]);

  const setAiEnabled = useCallback(async (enabled: boolean) => {
    if (!user) return false;
    const { error } = await supabase
      .from("privacy_settings")
      .upsert(
        { user_id: user.id, ai_enabled: enabled, ai_notice_version: AI_NOTICE_VERSION },
        { onConflict: "user_id" },
      );
    if (error) {
      toast.error(`Could not save your AI setting: ${error.message}`);
      return false;
    }
    setEnabledState(enabled);
    return true;
  }, [user]);

  const requestAi = useCallback(async (feature: AiFeature) => {
    if (!user) return false;
    if (isDemo()) {
      toast.info(DEMO_AI_MESSAGE);
      return false;
    }
    if (aiEnabled && readAcks(user.id).includes(feature)) return true;
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPending(feature);
    });
  }, [user, aiEnabled]);

  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPending(null);
  };

  const confirm = async () => {
    if (!user || !pending) return;
    setSaving(true);
    const ok = aiEnabled ? true : await setAiEnabled(true);
    setSaving(false);
    if (!ok) return finish(false);
    addAck(user.id, pending);
    finish(true);
  };

  const info = pending ? AI_FEATURES[pending] : null;

  return (
    <AiAccessContext.Provider value={{ aiEnabled, setAiEnabled, requestAi }}>
      {children}
      <Dialog open={!!pending} onOpenChange={(open) => { if (!open) finish(false); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> {info?.title}: what will be sent to AI
            </DialogTitle>
            <DialogDescription>
              When you continue, the following is sent through Lovable's AI gateway to Google's Gemini models,
              which process it in the USA. It is not used to train AI models.
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {info?.sends.map((s) => <li key={s}>{s}</li>)}
          </ul>
          {!aiEnabled && (
            <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              AI features are currently off. Continuing turns them on for all AI tools in your account. You can
              turn them off again at any time in Settings → Privacy &amp; data. The job tracker works without AI.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Details:{" "}
            <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2">Privacy Notice</a>
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => finish(false)}>Cancel</Button>
            <Button onClick={confirm} disabled={saving}>
              {saving ? "Saving…" : aiEnabled ? "Continue" : "Turn on AI and continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AiAccessContext.Provider>
  );
}

export function useAiAccess() {
  return useContext(AiAccessContext);
}
