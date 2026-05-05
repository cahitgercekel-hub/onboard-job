import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Download, Upload, Trash2, Sun, Moon, Monitor, Languages,
  Calendar as CalendarIcon, LogOut, User as UserIcon, FileText,
  Settings2, Shield, Palette, Hourglass,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { usePrefs, type Theme, type DateFormat } from "@/lib/preferences";
import { LANGUAGES } from "@/lib/i18n";
import { downloadJobsCsv, clearAllJobs } from "@/lib/jobsStore";
import { clearAllChats } from "@/lib/chatStore";
import { ImportCsvDialog } from "@/components/settings/ImportCsvDialog";
import { CvBaselineSection } from "@/components/settings/CvBaselineSection";
import { CvVersionsSection } from "@/components/settings/CvVersionsSection";
import { RecalculateFitnessSection } from "@/components/settings/RecalculateFitnessSection";
import { ApiTokensSection } from "@/components/settings/ApiTokensSection";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/usePlan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const themeOptions: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

function CardHeader({ icon: Icon, title }: { icon: typeof UserIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage, dateFormat, setDateFormat, ghostingDays, setGhostingDays } = usePrefs();
  const { user, signOut } = useAuth();
  const { plan } = usePlan();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const planLabel = plan === "free" ? "Free Plan" : plan === "pro" ? "Pro" : "Business";

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Account & Subscription */}
        <section className="surface-card p-6 flex flex-col">
          <CardHeader icon={UserIcon} title="Account & Subscription" />
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-foreground">Current Plan: {planLabel}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {plan === "free"
                ? "Upgrade for unlimited job tracking and advanced AI features."
                : "Thanks for supporting ONboard."}
            </p>
            <div className="mt-4 space-y-2">
              {plan === "free" && (
                <Button asChild className="w-full">
                  <Link to="/billing">Upgrade to Pro</Link>
                </Button>
              )}
              <Button asChild variant="link" className="w-full text-accent">
                <Link to="/billing">Manage Subscription</Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="text-sm font-semibold text-destructive mb-1">Danger Zone</h3>
            <p className="text-sm font-medium text-foreground">Delete account</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Permanently remove your account and all associated data. This cannot be undone.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAccountOpen(true)}
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete account
            </Button>
          </div>

          {user?.email && (
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground truncate">Signed in as {user.email}</p>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          )}
        </section>

        {/* 2. CV Management */}
        <section className="surface-card p-6 space-y-6">
          <CardHeader icon={FileText} title="CV Management" />
          <CvBaselineSection />
          <div className="border-t border-border pt-6">
            <CvVersionsSection />
          </div>
        </section>

        {/* 3. Workflow Preferences */}
        <section className="surface-card p-6 space-y-6">
          <CardHeader icon={Settings2} title="Workflow Preferences" />

          {/* Appearance */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> {t("settings.appearance")}
            </Label>
            <div className="inline-flex w-full rounded-md border border-border bg-muted/40 p-0.5">
              {themeOptions.map((o) => {
                const active = theme === o.value;
                const Icon = o.icon;
                return (
                  <button
                    key={o.value}
                    onClick={() => setTheme(o.value)}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-[5px] transition-colors",
                      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(`settings.${o.value}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" /> {t("settings.language")}
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date format + Ghosting threshold */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" /> {t("settings.dateFormat")}
              </Label>
              <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD.MM.YYYY">DD.MM.YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Hourglass className="h-3.5 w-3.5" /> Ghosting threshold
              </Label>
              <Select value={String(ghostingDays)} onValueChange={(v) => setGhostingDays(Number(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="21">21 days</SelectItem>
                  <SelectItem value="30">30 days (default)</SelectItem>
                  <SelectItem value="45">45 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <RecalculateFitnessSection />
          </div>
        </section>

        {/* 4. Data & Security */}
        <section className="surface-card p-6 space-y-6">
          <CardHeader icon={Shield} title="Data & Security" />

          <ApiTokensSection />

          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Data Export & Import</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={async () => {
                  try { await downloadJobsCsv(); toast.success("CSV downloaded"); }
                  catch (e: any) { toast.error(e?.message || "Export failed"); }
                }}
              >
                <span>Export data as CSV</span>
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => setImportOpen(true)}
              >
                <span>Import data from CSV</span>
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="text-sm font-semibold text-destructive mb-1">Danger Zone</h3>
            <p className="text-sm font-medium text-foreground">{t("settings.clearAll")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">{t("settings.clearAllHint")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> {t("settings.clearAll")}
            </Button>
          </div>
        </section>
      </div>

      <ClearAllDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      <DeleteAccountDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen} onDeleted={signOut} />
    </div>
  );
}

function ClearAllDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const ready = text === "DELETE";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (!v) setText(""); }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">{t("settings.confirmTitle")}</DialogTitle>
          <DialogDescription>{t("settings.confirmBody")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="confirm-delete" className="text-xs">{t("settings.typeDelete")}</Label>
          <Input
            id="confirm-delete"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button
            variant="destructive"
            disabled={!ready}
            onClick={async () => {
              try {
                await clearAllJobs();
                clearAllChats();
                onOpenChange(false);
                setText("");
                toast.success("All data cleared");
              } catch (e: any) {
                toast.error(e?.message || "Failed to clear");
              }
            }}
          >
            {t("settings.confirmBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  open, onOpenChange, onDeleted,
}: { open: boolean; onOpenChange: (v: boolean) => void; onDeleted: () => void | Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = text === "DELETE";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (!v) setText(""); }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently removes your account and all associated data (jobs, CVs, tokens). This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="confirm-delete-account" className="text-xs">Type DELETE to confirm</Label>
          <Input
            id="confirm-delete-account"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!ready || busy}
            onClick={async () => {
              setBusy(true);
              try {
                // Wipe local data first
                await clearAllJobs().catch(() => {});
                clearAllChats();
                toast.success("Account deletion requested. You've been signed out.");
                onOpenChange(false);
                setText("");
                await onDeleted();
              } catch (e: any) {
                toast.error(e?.message || "Failed to delete account");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
