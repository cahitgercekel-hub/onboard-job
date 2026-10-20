// Binds deleteAccountData() to a service-role Supabase client.
import type { DeletionDeps } from "./accountDeletion.ts";

const CV_BUCKET = "cvs";
const PAGE = 1000;

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- service-role Supabase client
export function supabaseDeletionDeps(admin: any): DeletionDeps {
  return {
    async listUserFiles(userId) {
      const paths: string[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await admin.storage.from(CV_BUCKET).list(userId, { limit: PAGE, offset });
        if (error) throw new Error(`storage list failed: ${error.message}`);
        // Entries without an id are folders; uploads are stored flat under <userId>/.
        for (const o of data ?? []) if (o.id) paths.push(`${userId}/${o.name}`);
        if (!data || data.length < PAGE) return paths;
      }
    },
    async removeFiles(paths) {
      const { error } = await admin.storage.from(CV_BUCKET).remove(paths);
      if (error) throw new Error(`storage remove failed: ${error.message}`);
    },
    async purgeRows(userId) {
      const { data, error } = await admin.rpc("purge_user_data", { _user_id: userId });
      if (error) throw new Error(`purge failed: ${error.message}`);
      return (data ?? {}) as Record<string, number>;
    },
    async deleteAuthUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error && error.status !== 404 && !/not.?found/i.test(error.message ?? "")) {
        throw new Error(`auth delete failed: ${error.message}`);
      }
    },
  };
}
