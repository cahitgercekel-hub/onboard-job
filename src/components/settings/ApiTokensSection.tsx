import { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface TokenRow {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

// Generate a random token: cvc_<43 url-safe chars>
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `cvc_${b64}`;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function ApiTokensSection() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const ingestUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-job`;

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("api_tokens")
      .select("id, name, token_prefix, created_at, last_used_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setTokens(data as TokenRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const token = generateToken();
      const token_hash = await sha256Hex(token);
      const token_prefix = token.slice(0, 12); // cvc_xxxxxxxx
      const { error } = await supabase.from("api_tokens").insert({
        user_id: user.id,
        name: name.trim(),
        token_hash,
        token_prefix,
      });
      if (error) throw error;
      setNewToken(token);
      setName("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create token");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("api_tokens").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Token revoked");
      await load();
    }
  };

  const copyToken = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">API Tokens</h3>
        <Button size="sm" onClick={() => { setNewToken(null); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> New token
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Use these tokens with the browser extension or any client to ingest jobs into your tracker.
      </p>

      <div className="rounded-md border border-border bg-muted/20 p-3 mb-4">
        <Label className="text-xs text-muted-foreground">Ingestion endpoint</Label>
        <code className="block text-xs mt-1 break-all text-foreground">{ingestUrl}</code>
        <p className="text-[11px] text-muted-foreground mt-2">
          POST JSON: <code>{`{ "companyName", "roleTitle", "jobUrl", "jobDescription" }`}</code> with header{" "}
          <code>X-Api-Token: &lt;your token&gt;</code>
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tokens yet. Create one to connect the extension.</p>
      ) : (
        <ul className="divide-y divide-border">
          {tokens.map((t) => (
            <li key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {t.token_prefix}…
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Created {new Date(t.created_at).toLocaleDateString()}
                  {t.last_used_at && ` • Last used ${new Date(t.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevoke(t.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) { setName(""); setNewToken(null); setCopied(false); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newToken ? "Token created" : "Create API token"}</DialogTitle>
            <DialogDescription>
              {newToken
                ? "Copy your token now — you won't be able to see it again."
                : "Give it a memorable name (e.g. \"Chrome extension\")."}
            </DialogDescription>
          </DialogHeader>

          {newToken ? (
            <div className="space-y-2">
              <Label className="text-xs">Your new token</Label>
              <div className="flex gap-2">
                <Input value={newToken} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copyToken}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="token-name" className="text-xs">Name</Label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chrome extension"
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            {newToken ? (
              <Button onClick={() => setCreateOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!name.trim() || creating}>
                  {creating ? "Creating…" : "Create token"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
