import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getPasswordScore } from "@/components/PasswordStrength";
import { Logo } from "@/components/Logo";
import { LegalFooterLinks } from "@/pages/legal/LegalLayout";
import { toast } from "sonner";

export default function AuthPage() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";
  const [tab, setTab] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate(from, { replace: true });
  }, [session, loading, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParsed = z.string().trim().email().safeParse(email);
    if (!emailParsed.success) {
      toast.error(t("auth.invalidEmail"));
      return;
    }

    setBusy(true);
    try {
      if (tab === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(emailParsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(t("auth.forgotHint"));
        setTab("login");
      } else if (tab === "signup") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        if (getPasswordScore(password) < 2) throw new Error("Please choose a stronger password");
        const { data, error } = await supabase.auth.signUp({
          email: emailParsed.data,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName.trim() || undefined },
          },
        });
        if (error) throw error;
        // With email confirmation on, there is no session yet — don't claim the user is signed in.
        if (data.session) toast.success("Account created — you're signed in!");
        else toast.success("Check your inbox and confirm your email address to finish signing up.");
      } else {
        if (!password) throw new Error("Password is required");
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error((result.error as any)?.message || "Google sign-in failed");
    } catch (err: any) {
      toast.error(err?.message || "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md surface-card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Logo size={64} />
          <div>
            <h1 className="text-lg font-semibold">{t("app.name")}</h1>
            <p className="text-xs text-muted-foreground">{t("app.tagline")}</p>
          </div>
        </div>

        <Button type="button" variant="outline" className="w-full mb-2" disabled={busy} onClick={signInWithGoogle}>
          <GoogleIcon /> {t("auth.googleBtn")}
        </Button>
        <p className="mb-4 text-[11px] leading-snug text-muted-foreground text-center">
          Google shares only your name, email address and profile picture with ONboard — no access to Gmail, Drive
          or other Google data.
        </p>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-card px-2 text-[11px] uppercase tracking-wide text-muted-foreground">{t("auth.orWithEmail")}</span></div>
        </div>

        <Tabs value={tab === "forgot" ? "login" : tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">{t("auth.loginTab")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth.signupTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            {tab === "forgot" ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <p className="text-xs text-muted-foreground">{t("auth.forgotHint")}</p>
                <Field id="forgot-email" label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} />
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? t("auth.sending") : t("auth.sendResetLink")}
                </Button>
                <button type="button" onClick={() => setTab("login")} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
                  {t("auth.backToLogin")}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <Field id="login-email" label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} />
                <Field id="login-password" label={t("auth.passwordLabel")} type="password" value={password} onChange={setPassword} />
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? t("auth.signingIn") : t("auth.loginTab")}
                </Button>
                <button type="button" onClick={() => setTab("forgot")} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
                  {t("auth.forgotTab")}
                </button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            {/* New sign-ups are disabled on the server (Lovable Cloud → Users → Settings → Disable sign-up).
                Existing accounts can still log in. Restore the sign-up form (with its Terms/Privacy note, see commit 5d355ad) when the beta opens. */}
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium text-foreground">ONboard is in a closed beta.</p>
              <p className="text-muted-foreground">
                New sign-ups are not open yet. If you'd like to try it, write to{" "}
                <a href="mailto:info@cahitgercekel.com?subject=ONboard%20beta" className="underline underline-offset-2">
                  info@cahitgercekel.com
                </a>.
              </p>
              <p className="text-xs text-muted-foreground">
                How ONboard handles data: <Link to="/privacy" className="underline underline-offset-2">Privacy Notice</Link>.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <LegalFooterLinks className="mt-6 border-t border-border pt-4" />
      </div>
    </div>
  );
}

function Field({ id, label, type, value, onChange }: { id: string; label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={type !== "text"} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 7.1 29.5 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.3 5.3C41.6 35.5 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
