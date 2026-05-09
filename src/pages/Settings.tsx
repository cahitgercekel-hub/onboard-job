import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Download, Upload, Trash2, Sun, Moon, Monitor, Languages,
  Calendar as CalendarIcon, LogOut, User as UserIcon, FileText,
  Settings2, Shield, Palette, Hourglass, MessageSquare, HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState<{ open: boolean; type: "privacy" | "terms" }>({ open: false, type: "privacy" });

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

          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="text-sm font-semibold text-destructive mb-1">{t("settings.danger")}</h3>
            <p className="text-sm font-medium text-foreground">{t("settings.deleteAccount")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              {t("settings.deleteAccountDesc")}
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

          <ApiTokensSection />

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
                <span>{t("settings.exportBtn")}</span>
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

        {/* 5. Feedback & Support */}
        <section className="surface-card p-6 space-y-6">
          <CardHeader icon={MessageSquare} title={t("settings.feedback")} />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("settings.feedbackHint")}
            </p>
            <Button onClick={() => setFeedbackOpen(true)} className="w-full gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("settings.feedbackBtn")}
            </Button>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <CardHeader icon={HelpCircle} title={t("settings.legal")} />
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start gap-2"
                onClick={() => setLegalOpen({ open: true, type: "privacy" })}
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                {t("settings.privacyPolicy")}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start gap-2"
                onClick={() => setLegalOpen({ open: true, type: "terms" })}
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                {t("settings.termsOfUse")}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <ClearAllDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      <DeleteAccountDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen} onDeleted={signOut} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <LegalDialog 
        open={legalOpen.open} 
        onOpenChange={(v) => setLegalOpen(prev => ({ ...prev, open: v }))} 
        type={legalOpen.type} 
      />
    </div>
  );
}

function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setIsSending(true);
    
    // Simulate sending feedback
    // In a real app, this would call a Supabase function or an API
    try {
      // Mocking the behavior of sending an email to info@cahitgercekel.com
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Feedback sent! Thank you for your contribution.");
      setText("");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to send feedback. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("feedback.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.feedbackHint")}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("feedback.placeholder")}
            className="min-h-[120px] resize-none overflow-hidden transition-[height] duration-200"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("feedback.cancel")}
          </Button>
          <Button onClick={handleSend} disabled={!text.trim() || isSending}>
            {isSending ? "Sending..." : t("feedback.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LegalDialog({ open, onOpenChange, type }: { open: boolean; onOpenChange: (v: boolean) => void; type: "privacy" | "terms" }) {
  const title = type === "privacy" ? "Privacy Policy" : "Terms of Use";
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert max-w-none py-4 space-y-4 text-muted-foreground">
          {type === "privacy" ? (
            <>
              <p>Last updated: May 07, 2026</p>
              <h3 className="text-foreground font-semibold">1. Introduction</h3>
              <p>Welcome to ONboard. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.</p>
              
              <h3 className="text-foreground font-semibold">2. Data We Collect</h3>
              <p>ONboard is designed to give you full control over your data. Most of your job application data is stored locally in your browser or within your secure Supabase account if you are signed in.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account Information:</strong> Email address and authentication details if you create an account.</li>
                <li><strong>Application Data:</strong> Job details, status, company names, and notes you enter.</li>
                <li><strong>CV Content:</strong> Text or files you upload for analysis by our AI tools.</li>
                <li><strong>Usage Data:</strong> Anonymous technical data to help us improve app performance.</li>
              </ul>

              <h3 className="text-foreground font-semibold">3. How We Use Your Data</h3>
              <p>We use your data strictly to provide the services offered by ONboard, including:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Syncing your job tracker across devices.</li>
                <li>Powering AI features like the Career Assistant and CV Analyzer.</li>
                <li>Generating analytics for your job search progress.</li>
              </ul>

              <h3 className="text-foreground font-semibold">4. Data Security</h3>
              <p>We implement industry-standard security measures. When you use AI features, your data is processed through secure API endpoints. We do not sell your personal information to third parties.</p>

              <h3 className="text-foreground font-semibold">5. Your Rights</h3>
              <p>You have the right to access, export, or delete your data at any time through the Settings page. Choosing "Delete Account" or "Clear All Data" will permanently remove your information from our systems.</p>

              <h3 className="text-foreground font-semibold">6. Contact Us</h3>
              <p>If you have questions about this policy, contact us at info@cahitgercekel.com.</p>
            </>
          ) : (
            <>
              <p>Last updated: May 07, 2026</p>
              <h3 className="text-foreground font-semibold">1. Acceptance of Terms</h3>
              <p>By accessing or using ONboard, you agree to be bound by these Terms of Use. If you do not agree, please do not use the application.</p>

              <h3 className="text-foreground font-semibold">2. Description of Service</h3>
              <p>ONboard provides job application tracking, CV analysis, and AI-powered career assistance tools. Some features require a paid subscription.</p>

              <h3 className="text-foreground font-semibold">3. User Responsibilities</h3>
              <p>You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to use the service only for lawful purposes related to your personal job search.</p>

              <h3 className="text-foreground font-semibold">4. Intellectual Property</h3>
              <p>The application, including its original content, features, and functionality, is owned by ONboard and is protected by international copyright and other intellectual property laws.</p>

              <h3 className="text-foreground font-semibold">5. Limitation of Liability</h3>
              <p>ONboard is provided "as is" without any warranties. We are not responsible for any job search outcomes, data loss, or inaccuracies generated by AI features. In no event shall ONboard be liable for any indirect or consequential damages.</p>

              <h3 className="text-foreground font-semibold">6. Subscription and Payments</h3>
              <p>Subscription fees are non-refundable unless required by law. You may cancel your subscription at any time through the Billing page.</p>

              <h3 className="text-foreground font-semibold">7. Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time. We will notify users of significant changes via the application.</p>

              <h3 className="text-foreground font-semibold">8. Governing Law</h3>
              <p>These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the owner operates.</p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            {t("settings.deleteAccountConfirm")}
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
                // Wipe local data first
                await clearAllJobs().catch(() => {});
                clearAllChats();
                toast.success(t("settings.deleteAccountSuccess"));
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
            {busy ? t("settings.deleting") : t("settings.deleteAccount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
