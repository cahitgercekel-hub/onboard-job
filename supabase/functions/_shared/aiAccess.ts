// Server-side gate for optional AI features: nothing is sent to the AI gateway unless the user
// has turned AI features on (public.privacy_settings.ai_enabled). The browser cannot bypass this.

export const AI_DISABLED_BODY = {
  error: "AI features are turned off for your account. You can turn them on in Settings → Privacy & data.",
  code: "ai_disabled",
};

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client (Deno types differ from the app's)
export async function isAiEnabled(client: any, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from("privacy_settings")
    .select("ai_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("privacy_settings lookup failed", error.code);
    return false;
  }
  return data?.ai_enabled === true;
}
