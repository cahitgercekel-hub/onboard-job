// "Download my data": everything ONboard stores about the signed-in user, in one JSON file.
// Reads go through RLS with the user's own session, so only the user's rows can be included.
// If any part fails, the export fails — it never claims to be complete when it is not.

import type { User } from "@supabase/supabase-js";
import { readLocalChats, readLocalPreferences } from "./localData";

// Column lists are explicit so secrets (e.g. api token hashes) never end up in an export.
const TABLES = {
  jobs: "*",
  cv_baseline: "cv_text, file_name, file_path, created_at, updated_at",
  cv_versions: "id, name, notes, created_at, updated_at",
  api_tokens: "id, name, token_prefix, created_at, last_used_at",
  privacy_settings: "ai_enabled, ai_notice_version, ai_enabled_at, ai_disabled_at, created_at, updated_at",
  privacy_events: "event, notice_version, created_at",
  profiles: "display_name, avatar_url, created_at, updated_at",
} as const;

type Table = keyof typeof TABLES;

interface QueryResult { data: unknown[] | null; error: { message: string } | null }

/** The minimal client surface used here (satisfied by the Supabase client). */
export interface ExportClient {
  from(table: Table): {
    select(columns: string): { eq(column: string, value: string): PromiseLike<QueryResult> };
  };
}

export const EXPORT_NOT_INCLUDED = [
  "Your original CV file — download it separately with \"Download CV file\".",
  "Server, authentication and request logs kept by our hosting providers (Lovable, Supabase, Cloudflare).",
  "Records of AI requests kept by Lovable (up to 90 days).",
  "Copies in backups.",
  "AI chat history stored in other browsers or on other devices.",
];

export async function buildDataExport(
  client: ExportClient,
  user: Pick<User, "id" | "email" | "created_at" | "last_sign_in_at" | "app_metadata" | "user_metadata">,
  storage: Storage = localStorage,
) {
  const entries = await Promise.all(
    (Object.keys(TABLES) as Table[]).map(async (table) => {
      const { data, error } = await client.from(table).select(TABLES[table]).eq("user_id", user.id);
      if (error) throw new Error(`Could not export ${table}: ${error.message}`);
      return [table, data ?? []] as const;
    }),
  );

  return {
    format: "onboard-data-export",
    version: 1,
    generatedAt: new Date().toISOString(),
    scope:
      "All data ONboard stores in its database about your account, plus the AI chat history and settings stored in this browser.",
    account: {
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      signInProviders: user.app_metadata?.providers ?? [],
      profileFromSignUp: user.user_metadata ?? {},
    },
    database: Object.fromEntries(entries),
    thisDevice: {
      aiChatThreads: readLocalChats(user.id, storage),
      preferences: readLocalPreferences(storage),
    },
    notIncluded: EXPORT_NOT_INCLUDED,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
