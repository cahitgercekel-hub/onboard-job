import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BriefcaseBusiness } from "lucide-react";
import { supabase } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength, getPasswordScore } from "@/components/PasswordStrength";
import { toast } from "sonner";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts a recovery session in the URL hash; auth client picks it up automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error(t("resetPassword.matchError"));
    if (getPasswordScore(password) < 2) return toast.error(t("resetPassword.strengthError"));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("resetPassword.successToast"));
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md surface-card p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-500 text-primary-foreground">
            <BriefcaseBusiness className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{t("resetPassword.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("resetPassword.subtitle")}</p>
          </div>
        </div>
        {!ready ? (
          <p className="text-sm text-muted-foreground">{t("resetPassword.validating")}</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="np">{t("resetPassword.newPasswordLabel")}</Label>
              <Input id="np" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <PasswordStrength password={password} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cp">{t("resetPassword.confirmPasswordLabel")}</Label>
              <Input id="cp" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? t("resetPassword.updating") : t("resetPassword.updateBtn")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
