import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface CvVersion {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

type Row = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const rowToVersion = (r: Row): CvVersion => ({
  id: r.id,
  name: r.name,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function useCvVersions() {
  const { user } = useAuth();
  const [versions, setVersions] = useState<CvVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("cv_versions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setVersions((data as Row[]).map(rowToVersion));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setVersions([]);
      setLoading(false);
      return;
    }
    reload(user.id);

    const channel = supabase.channel(`cv-versions-${user.id}-${Math.random().toString(36).slice(2, 8)}`);
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cv_versions", filter: `user_id=eq.${user.id}` },
        () => reload(user.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, reload]);

  const addVersion = useCallback(async (name: string, notes?: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("cv_versions")
      .insert({ user_id: user.id, name, notes: notes ?? null })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    return rowToVersion(data as Row);
  }, [user]);

  const updateVersion = useCallback(async (id: string, patch: { name?: string; notes?: string | null }) => {
    const { error } = await supabase.from("cv_versions").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const removeVersion = useCallback(async (id: string) => {
    const { error } = await supabase.from("cv_versions").delete().eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  return { versions, loading, addVersion, updateVersion, removeVersion };
}
