import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { LEGAL, legalGaps } from "@/lib/legal";

/** Visible placeholder for information that has not been provided yet. Never replaced by a guess. */
export function Missing({ what }: { what: string }) {
  return (
    <span className="rounded bg-destructive/10 px-1 font-medium text-destructive">
      [MISSING: {what}]
    </span>
  );
}

export function LegalFooterLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground ${className}`}>
      <Link to="/privacy" className="hover:text-foreground underline-offset-2 hover:underline">Privacy</Link>
      <Link to="/terms" className="hover:text-foreground underline-offset-2 hover:underline">Terms</Link>
      <Link to="/imprint" className="hover:text-foreground underline-offset-2 hover:underline">Imprint</Link>
    </nav>
  );
}

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const { session } = useAuth();
  const gaps = legalGaps();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to={session ? "/" : "/auth"} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <Logo size={28} />
            <span className="font-semibold text-foreground">ONboard</span>
          </Link>
          <LegalFooterLinks />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {gaps.length > 0 && (
          <div role="note" className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4" /> Draft — not final
            </p>
            <p className="mt-1 text-muted-foreground">
              This text describes how the beta works today, but some required information is still open:
            </p>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {gaps.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </div>
        )}

        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: {LEGAL.lastUpdated}</p>

        <article className="mt-6 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_code]:text-foreground [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mb-1 [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:my-1 [&_p]:my-3 [&_strong]:text-foreground [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </article>
      </main>

      <footer className="border-t border-border py-6">
        <LegalFooterLinks />
      </footer>
    </div>
  );
}
