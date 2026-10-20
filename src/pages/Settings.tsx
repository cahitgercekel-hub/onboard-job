import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Download, Upload, Trash2, Sun, Moon, Monitor, Languages,
  Calendar as CalendarIcon, LogOut, User as UserIcon, FileText,
  Settings2, Shield, Palette, Hourglass, MessageSquare, HelpCircle,
  Mail, Lock, Sparkles, Image as ImageIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { usePrefs, type Theme, type DateFormat } from "@/lib/preferences";
import { LANGUAGES } from "@/lib/i18n";
import { downloadJobsCsv, clearAllJobs } from "@/lib/jobsStore";
import { supabase } from "@/lib/db";
import { useAiAccess } from "@/lib/aiAccess";
import { LEGAL } from "@/lib/legal";
import { buildDataExport, downloadJson, type ExportClient } from "@/lib/dataExport";
import { clearLocalChats } from "@/lib/localData";
import { deleteMyAccount } from "@/lib/accountDeletion";
import { DEMO_AI_MESSAGE, isDemo } from "@/lib/demo/demoMode";
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

function CardHeader({ icon: Icon, title }: { icon: any; title: string }) {
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

  const planLabel = plan === "free" ? t("settings.planLabelFree") : plan === "pro" ? t("common.plans.pro") : t("common.plans.business");

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Account & Subscription */}
        <section className="surface-card p-6 flex flex-col">
          <CardHeader icon={UserIcon} title={t("settings.accountTitle")} />
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-foreground">{t("common.status")}: {planLabel}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {plan === "free"
                ? t("settings.freePlanDesc")
                : t("settings.proPlanDesc")}
            </p>
            <div className="mt-4 space-y-2">
              {plan === "free" && (
                <Button asChild className="w-full">
                  <Link to="/billing">{t("settings.upgradeToPro")}</Link>
                </Button>
              )}
              <Button asChild variant="link" className="w-full text-accent">
                <Link to="/billing">{t("settings.manageSub")}</Link>
              </Button>
            </div>
          </div>

          {!isDemo() && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="text-sm font-semibold text-destructive mb-1">{t("settings.danger")}</h3>
            <p className="text-sm font-medium text-foreground">{t("settings.deleteAccount")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              {t("settings.deleteAccountDesc")} {t("settings.deleteAccountNote")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAccountOpen(true)}
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> {t("settings.deleteAccount")}
            </Button>
          </div>
          )}

          {user?.email && (
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground truncate">{t("settings.signedInAs", { email: user.email })}</p>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" /> {t("settings.signOut")}
              </Button>
            </div>
          )}
        </section>

        {/* 2. CV Management */}
        <section className="surface-card p-6 space-y-6">
          <CardHeader icon={FileText} title={t("settings.cvTitle")} />
          <CvBaselineSection />
          <div className="border-t border-border pt-6">
            <CvVersionsSection />
          </div>
        </section>

        {/* 3. Workflow Preferences */}
        <section className="surface-card p-6 space-y-6">
          <CardHeader icon={Settings2} title={t("settings.workflowTitle")} />

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
                <Hourglass className="h-3.5 w-3.5" /> {t("settings.ghostingThreshold")}
              </Label>
              <Select value={String(ghostingDays)} onValueChange={(v) => setGhostingDays(Number(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">{t("settings.daysCount", { count: 14 })}</SelectItem>
                  <SelectItem value="21">{t("settings.daysCount", { count: 21 })}</SelectItem>
                  <SelectItem value="30">{t("settings.daysCount", { count: 30 })} (default)</SelectItem>
                  <SelectItem value="45">{t("settings.daysCount", { count: 45 })}</SelectItem>
                  <SelectItem value="60">{t("settings.daysCount", { count: 60 })}</SelectItem>
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
          <CardHeader icon={Shield} title={t("settings.dataTitle")} />

          {!isDemo() && <ApiTokensSection />}

          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("settings.exportImportTitle")}</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={async () => {
                  try { await downloadJobsCsv(); toast.success("CSV downloaded"); }
                  catch (e: any) { toast.error(e?.message || "Export failed"); }
                }}
              >
                <span>{t("settings.exportJobsCsv")}</span>
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => setImportOpen(true)}
              >
                <span>{t("settings.importBtn")}</span>
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="text-sm font-semibold text-destructive mb-1">{t("settings.danger")}</h3>
            <p className="text-sm font-medium text-foreground">{t("settings.clearJobs")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">{t("settings.clearJobsHint")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> {t("settings.clearJobs")}
            </Button>
          </div>
        </section>

        {/* 5. Privacy & data */}
        <PrivacySection />

        {/* 6. Feedback & Support */}
        <section className="surface-card p-6 space-y-6">
          <CardHeader icon={MessageSquare} title={t("settings.feedback")} />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("settings.feedbackHint")} {t("settings.contactHint", { email: LEGAL.operator.email })}
            </p>
            <Button asChild className="w-full gap-2">
              <a href={`mailto:${LEGAL.operator.email}?subject=${encodeURIComponent("ONboard beta feedback")}`}>
                <Mail className="h-4 w-4" />
                {t("settings.contactBtn")}
              </a>
            </Button>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <CardHeader icon={HelpCircle} title={t("settings.legal")} />
            <div className="grid grid-cols-3 gap-3">
              <Button asChild variant="outline" size="sm" className="justify-start gap-2">
                <Link to="/privacy">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {t("settings.privacyPolicy")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start gap-2">
                <Link to="/terms">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {t("settings.termsOfUse")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start gap-2">
                <Link to="/imprint">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {t("settings.imprint")}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>

      <ClearAllDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      <DeleteAccountDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen} />
    </div>
  );
}

function PrivacySection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { thirdPartyLogos, setThirdPartyLogos } = usePrefs();
  const { aiEnabled, setAiEnabled } = useAiAccess();
  const [savingAi, setSavingAi] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cvFile, setCvFile] = useState<{ path: string; name: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("cv_baseline")
      .select("file_path, file_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setCvFile(data?.file_path ? { path: data.file_path, name: data.file_name ?? "cv" } : null));
  }, [user]);

  const toggleAi = async (on: boolean) => {
    setSavingAi(true);
    const ok = await setAiEnabled(on);
    setSavingAi(false);
    if (ok) toast.success(on ? "AI features turned on" : "AI features turned off");
  };

  const exportAll = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const data = await buildDataExport(supabase as unknown as ExportClient, user);
      downloadJson(`onboard-my-data-${new Date().toISOString().slice(0, 10)}.json`, data);
      toast.success("Your data export was downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed — nothing was downloaded");
    } finally {
      setExporting(false);
    }
  };

  const downloadCv = async () => {
    if (!cvFile) return;
    const { data, error } = await supabase.storage.from("cvs").download(cvFile.path);
    if (error || !data) return toast.error(error?.message || "Download failed");
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = cvFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearChats = () => {
    if (!user) return;
    const count = clearLocalChats(user.id);
    toast.success(t("settings.clearChatsDone", { count }));
  };

  return (
    <section className="surface-card p-6 space-y-6">
      <CardHeader icon={Lock} title={t("settings.privacyTitle")} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <Label htmlFor="ai-toggle" className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> {t("settings.aiToggle")}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            {isDemo()
              ? DEMO_AI_MESSAGE
              : <>{t("settings.aiToggleHint")} <Link to="/privacy" className="underline underline-offset-2">{t("settings.privacyPolicy")}</Link></>}
          </p>
        </div>
        <Switch id="ai-toggle" checked={aiEnabled === true} disabled={isDemo() || aiEnabled === null || savingAi} onCheckedChange={toggleAi} />
      </div>

      {!isDemo() && (
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label htmlFor="logo-toggle" className="text-sm font-medium flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> {t("settings.logosToggle")}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">{t("settings.logosToggleHint")}</p>
        </div>
        <Switch id="logo-toggle" checked={thirdPartyLogos} onCheckedChange={setThirdPartyLogos} />
      </div>
      )}

      <div className="border-t border-border pt-6 space-y-2">
        <Button variant="outline" className="w-full justify-between" onClick={exportAll} disabled={exporting}>
          <span>{exporting ? "Preparing…" : t("settings.downloadData")}</span>
          <Download className="h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground">{t("settings.downloadDataHint")}</p>
        {cvFile && (
          <Button variant="outline" className="w-full justify-between" onClick={downloadCv}>
            <span>{t("settings.downloadCv")}</span>
            <Download className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" className="w-full justify-between" onClick={clearChats}>
          <span>{t("settings.clearChats")}</span>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </section>
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
          <DialogDescription>{t("settings.clearJobsBody")}</DialogDescription>
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
                onOpenChange(false);
                setText("");
                toast.success(t("settings.clearJobsDone"));
              } catch (e: any) {
                toast.error(e?.message || "Failed to delete jobs");
              }
            }}
          >
            {t("settings.clearJobs")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
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
          <DialogTitle className="text-destructive">{t("settings.deleteAccountTitle")}</DialogTitle>
          <DialogDescription>
            {t("settings.deleteAccountConfirm")} {t("settings.deleteAccountNote")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="confirm-delete-account" className="text-xs">{t("settings.typeDelete")}</Label>
          <Input
            id="confirm-delete-account"
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
            disabled={!ready || busy}
            onClick={async () => {
              setBusy(true);
              try {
                // Server deletes files, rows and the auth account; only then is this browser wiped and signed out.
                await deleteMyAccount();
                onOpenChange(false);
                setText("");
                toast.success(t("settings.deleteAccountDone"));
              } catch (e: any) {
                // Dialog stays open so the user can retry; nothing claims success.
                toast.error(e?.message || "Account deletion did not finish. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("settings.deleting") : t("settings.deleteAccount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
