import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings as SettingsIcon, Download, Upload, Trash2, Sun, Moon, Monitor, Languages, Calendar as CalendarIcon } from "lucide-react";
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
import { ImportCsvDialog } from "@/components/settings/ImportCsvDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const themeOptions: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage, dateFormat, setDateFormat } = usePrefs();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-accent" /> {t("settings.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <section className="surface-card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-foreground">{t("settings.prefs")}</h2>
        </div>
        <div className="space-y-6">
          {/* Appearance */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <Label className="text-sm font-medium">{t("settings.appearance")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.appearanceHint")}</p>
            </div>
            <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
              {themeOptions.map((o) => {
                const active = theme === o.value;
                const Icon = o.icon;
                return (
                  <button
                    key={o.value}
                    onClick={() => setTheme(o.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[5px] transition-colors",
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
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" /> {t("settings.language")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.languageHint")}</p>
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Format */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" /> {t("settings.dateFormat")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.dateFormatHint")}</p>
            </div>
            <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD.MM.YYYY">DD.MM.YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-foreground">{t("settings.data")}</h2>
        </div>
        <div className="space-y-5">
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
            <div>
              <Label className="text-sm font-medium">{t("settings.export")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.exportHint")}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => { downloadJobsCsv(); toast.success("CSV downloaded"); }}
            >
              <Download className="h-4 w-4" /> {t("settings.export")}
            </Button>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center border-t border-border pt-5">
            <div>
              <Label className="text-sm font-medium">Import data from CSV</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add jobs from a CSV file matching the export format. You'll preview rows before they're saved.
              </p>
            </div>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
          </div>
        </div>
      </section>

      <section className="surface-card p-6 border-destructive/40">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-destructive">{t("settings.danger")}</h2>
        </div>
        <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <Label className="text-sm font-medium">{t("settings.clearAll")}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">{t("settings.clearAllHint")}</p>
          </div>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" /> {t("settings.clearAll")}
          </Button>
        </div>
      </section>

      <ClearAllDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
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
            onClick={() => {
              clearAllJobs();
              onOpenChange(false);
              setText("");
              toast.success("All data cleared");
            }}
          >
            {t("settings.confirmBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
