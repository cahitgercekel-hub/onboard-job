import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { format as fmt } from "date-fns";

export type Theme = "light" | "dark" | "system";
export type DateFormat = "DD.MM.YYYY" | "MM/DD/YYYY";

interface Prefs {
  theme: Theme;
  language: string;
  dateFormat: DateFormat;
  ghostingDays: number;
  /** Load company logos from third-party logo services (sends company domains + IP to them). Off by default. */
  thirdPartyLogos: boolean;
}

interface Ctx extends Prefs {
  setTheme: (t: Theme) => void;
  setLanguage: (l: string) => void;
  setDateFormat: (d: DateFormat) => void;
  setGhostingDays: (d: number) => void;
  setThirdPartyLogos: (v: boolean) => void;
  formatDate: (iso: string) => string;
}

const STORAGE = "jat.prefs.v1";
const PreferencesContext = createContext<Ctx | null>(null);

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return { theme: "system", language: "en", dateFormat: "DD.MM.YYYY", ghostingDays: 30, thirdPartyLogos: false, ...JSON.parse(raw) };
  } catch {/* ignore */}
  return { theme: "system", language: localStorage.getItem("jat.lang") || "en", dateFormat: "DD.MM.YYYY", ghostingDays: 30, thirdPartyLogos: false };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const wantsDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", wantsDark);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());
  const { i18n } = useTranslation();

  useEffect(() => {
    applyTheme(prefs.theme);
    if (prefs.theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [prefs.theme]);

  useEffect(() => {
    if (i18n.language !== prefs.language) i18n.changeLanguage(prefs.language);
  }, [prefs.language, i18n]);

  const persist = (next: Prefs) => {
    setPrefs(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));
  };

  const setTheme = useCallback((theme: Theme) => persist({ ...readPrefs(), theme }), []);
  const setLanguage = useCallback((language: string) => persist({ ...readPrefs(), language }), []);
  const setDateFormat = useCallback((dateFormat: DateFormat) => persist({ ...readPrefs(), dateFormat }), []);
  const setGhostingDays = useCallback((ghostingDays: number) => persist({ ...readPrefs(), ghostingDays }), []);
  const setThirdPartyLogos = useCallback((thirdPartyLogos: boolean) => persist({ ...readPrefs(), thirdPartyLogos }), []);

  const formatDate = useCallback(
    (iso: string) => {
      try {
        const d = new Date(iso);
        return prefs.dateFormat === "DD.MM.YYYY" ? fmt(d, "dd.MM.yyyy") : fmt(d, "MM/dd/yyyy");
      } catch {
        return iso;
      }
    },
    [prefs.dateFormat]
  );

  const value = useMemo<Ctx>(
    () => ({ ...prefs, setTheme, setLanguage, setDateFormat, setGhostingDays, setThirdPartyLogos, formatDate }),
    [prefs, setTheme, setLanguage, setDateFormat, setGhostingDays, setThirdPartyLogos, formatDate]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePrefs must be used within PreferencesProvider");
  return ctx;
}
