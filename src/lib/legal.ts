// Single source of truth for the facts the Privacy notice, Terms and Imprint depend on.
// `null` means "not confirmed yet": the pages then show a visible MISSING marker and a draft banner,
// so the beta never looks finished while required information is absent. Fill these in yourself —
// do not guess values.

export type Confirmable<T> = T | null;

export const LEGAL = {
  /** Date shown as "last updated" on the legal pages. */
  lastUpdated: "2026-10-20",

  operator: {
    /** Full legal name of the person running ONboard (the controller under GDPR). */
    name: "Cahit Emre Gerçekel" as Confirmable<string>,
    /** Postal address where the operator can be reached (street, postcode, city, country). */
    postalAddress: null as Confirmable<string>,
    email: "info@cahitgercekel.com",
  },

  /**
   * Database location as shown in Lovable (More → Cloud → Database → Manage → Settings → Database location).
   * Read there on 2026-10-20: "Europe (Ireland)".
   */
  databaseRegion: "EU — Europe (Ireland)" as Confirmable<string>,

  /** Whether a data processing agreement (Art. 28 GDPR) with Lovable is in place for this workspace. */
  lovableDpaInPlace: false,

  /** Lovable "Visitor analytics" for the published site (Project settings → General → Publishing). */
  // Turned off 2026-10-20; verified the same day that the published HTML no longer loads
  // /~flock.js or the /__l5e events SDK.
  lovableVisitorAnalytics: "disabled" as "unknown" | "disabled" | "enabled",

  /** Lovable "AI app context" (stores full AI requests/responses for 90 days). Off = "disabled". */
  // Off: checked in Lovable project settings (Publishing → AI app context) on 2026-10-20.
  lovableAiAppContext: "disabled" as "unknown" | "disabled" | "enabled",

  /** Inactivity period after which accounts are deleted (retention-cleanup). null = not decided. */
  inactiveAccountDeletionDays: 365 as Confirmable<number>,

  /** Set to true only once retention-cleanup runs on a schedule with RETENTION_APPLY=true. */
  retentionCleanupScheduled: false,

  /** Legal bases below are proposals and must be confirmed by a legal review. */
  legalBasesReviewed: false,
};

export const AI_NOTICE_VERSION = "2026-10-20";

/** Human-readable list of what is still missing before the legal pages can be called final. */
export function legalGaps(): string[] {
  const gaps: string[] = [];
  if (!LEGAL.operator.name) gaps.push("Operator's full name");
  if (!LEGAL.operator.postalAddress) gaps.push("Operator's postal address");
  if (!LEGAL.databaseRegion) gaps.push("Confirmed database region");
  if (!LEGAL.lovableDpaInPlace) gaps.push("Data processing agreement with Lovable (only on Business plan, per Lovable 2026-10-20)");
  if (LEGAL.lovableVisitorAnalytics !== "disabled") gaps.push("Lovable visitor analytics turned off (or consent mechanism added)");
  if (LEGAL.lovableAiAppContext !== "disabled") gaps.push("Lovable 'AI app context' setting confirmed");
  if (LEGAL.inactiveAccountDeletionDays === null) gaps.push("Retention period for inactive accounts");
  else if (!LEGAL.retentionCleanupScheduled) gaps.push("Scheduled deletion of inactive accounts (not running yet)");
  if (!LEGAL.legalBasesReviewed) gaps.push("Legal review of processing purposes and legal bases");
  return gaps;
}
