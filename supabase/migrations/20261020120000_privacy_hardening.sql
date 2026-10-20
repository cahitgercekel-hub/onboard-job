-- Privacy & data-protection hardening for the external beta.
-- Idempotent: safe to run more than once. Does not delete or rewrite existing user rows.

-- 1. cv_versions: tie rows to auth.users so account deletion cascades, scope policies to signed-in users.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cv_versions_user_id_fkey') THEN
    ALTER TABLE public.cv_versions
      ADD CONSTRAINT cv_versions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_cv_versions_user ON public.cv_versions(user_id);

ALTER POLICY "Users view own cv versions" ON public.cv_versions TO authenticated;
ALTER POLICY "Users insert own cv versions" ON public.cv_versions TO authenticated;
ALTER POLICY "Users update own cv versions" ON public.cv_versions TO authenticated;
ALTER POLICY "Users delete own cv versions" ON public.cv_versions TO authenticated;

-- 2. Explicit WITH CHECK on UPDATE policies: a row can never be moved to another user_id.
ALTER POLICY "Users can update own jobs" ON public.jobs WITH CHECK (auth.uid() = user_id);
ALTER POLICY "Users can update own cv" ON public.cv_baseline WITH CHECK (auth.uid() = user_id);
ALTER POLICY "Users update own cv versions" ON public.cv_versions WITH CHECK (auth.uid() = user_id);
ALTER POLICY "Users can update own profile" ON public.profiles WITH CHECK (auth.uid() = user_id);

-- 3. A job may only reference a CV version owned by the same user.
CREATE OR REPLACE FUNCTION public.enforce_job_cv_version_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cv_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cv_versions v
    WHERE v.id = NEW.cv_version_id AND v.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'cv_version_id does not belong to this user' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_job_cv_version_owner() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS jobs_cv_version_owner ON public.jobs;
CREATE TRIGGER jobs_cv_version_owner
  BEFORE INSERT OR UPDATE OF cv_version_id, user_id ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_job_cv_version_owner();

-- 4. Nothing in the app is readable without signing in: drop table privileges for anon,
--    and privileges RLS does not cover (TRUNCATE, TRIGGER, REFERENCES) for authenticated.
REVOKE ALL ON public.jobs, public.cv_baseline, public.cv_versions, public.api_tokens,
  public.profiles, public.user_roles FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.jobs, public.cv_baseline, public.cv_versions,
  public.api_tokens, public.profiles, public.user_roles FROM authenticated;

-- 5. CV bucket: enforce the 10 MB limit and file types the UI accepts on the server too.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
WHERE id = 'cvs';

-- 6. Per-user privacy choices. AI features are OFF until the user turns them on.
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_notice_version TEXT,
  ai_enabled_at TIMESTAMPTZ,
  ai_disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.privacy_settings FROM anon;

DROP POLICY IF EXISTS "Users view own privacy settings" ON public.privacy_settings;
CREATE POLICY "Users view own privacy settings"
  ON public.privacy_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own privacy settings" ON public.privacy_settings;
CREATE POLICY "Users insert own privacy settings"
  ON public.privacy_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own privacy settings" ON public.privacy_settings;
CREATE POLICY "Users update own privacy settings"
  ON public.privacy_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Append-only history of AI on/off changes (who, what notice version, when), for accountability.
CREATE TABLE IF NOT EXISTS public.privacy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('ai_enabled', 'ai_disabled')),
  notice_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_privacy_events_user ON public.privacy_events(user_id);
ALTER TABLE public.privacy_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.privacy_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.privacy_events FROM authenticated;

DROP POLICY IF EXISTS "Users view own privacy events" ON public.privacy_events;
CREATE POLICY "Users view own privacy events"
  ON public.privacy_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Timestamps and history are written by the server, never trusted from the client.
CREATE OR REPLACE FUNCTION public.track_privacy_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.ai_enabled_at := CASE WHEN NEW.ai_enabled THEN now() END;
    NEW.ai_disabled_at := NULL;
    IF NEW.ai_enabled THEN
      INSERT INTO public.privacy_events (user_id, event, notice_version)
      VALUES (NEW.user_id, 'ai_enabled', NEW.ai_notice_version);
    END IF;
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.ai_enabled_at := OLD.ai_enabled_at;
    NEW.ai_disabled_at := OLD.ai_disabled_at;
    IF NEW.ai_enabled AND NOT OLD.ai_enabled THEN
      NEW.ai_enabled_at := now();
      INSERT INTO public.privacy_events (user_id, event, notice_version)
      VALUES (NEW.user_id, 'ai_enabled', NEW.ai_notice_version);
    ELSIF OLD.ai_enabled AND NOT NEW.ai_enabled THEN
      NEW.ai_disabled_at := now();
      INSERT INTO public.privacy_events (user_id, event, notice_version)
      VALUES (NEW.user_id, 'ai_disabled', NEW.ai_notice_version);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.track_privacy_settings() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS privacy_settings_track ON public.privacy_settings;
CREATE TRIGGER privacy_settings_track
  BEFORE INSERT OR UPDATE ON public.privacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.track_privacy_settings();

-- 7. Account deletion: remove every app row of one user in a single transaction.
--    Only the service role (edge functions) may call it; the user id comes from a verified JWT there.
CREATE OR REPLACE FUNCTION public.purge_user_data(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB := '{}'::jsonb;
  n INTEGER;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user id required';
  END IF;
  DELETE FROM public.jobs WHERE user_id = _user_id;             GET DIAGNOSTICS n = ROW_COUNT; result := result || jsonb_build_object('jobs', n);
  DELETE FROM public.cv_versions WHERE user_id = _user_id;      GET DIAGNOSTICS n = ROW_COUNT; result := result || jsonb_build_object('cv_versions', n);
  DELETE FROM public.cv_baseline WHERE user_id = _user_id;      GET DIAGNOSTICS n = ROW_COUNT; result := result || jsonb_build_object('cv_baseline', n);
  DELETE FROM public.api_tokens WHERE user_id = _user_id;       GET DIAGNOSTICS n = ROW_COUNT; result := result || jsonb_build_object('api_tokens', n);
  DELETE FROM public.privacy_events WHERE user_id = _user_id;   GET DIAGNOSTICS n = ROW_COUNT; result := result || jsonb_build_object('privacy_events', n);
  DELETE FROM public.privacy_settings WHERE user_id = _user_id; GET DIAGNOSTICS n = ROW_COUNT; result := result || jsonb_build_object('privacy_settings', n);
  DELETE FROM public.profiles WHERE user_id = _user_id;         GET DIAGNOSTICS n = ROW_COUNT; result := result || jsonb_build_object('profiles', n);
  DELETE FROM public.user_roles WHERE user_id = _user_id;       GET DIAGNOSTICS n = ROW_COUNT; result := result || jsonb_build_object('user_roles', n);
  RETURN result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.purge_user_data(UUID) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_user_data(UUID) TO service_role;

-- 8. Retention support: accounts with no activity for longer than a given interval.
--    last_sign_in_at alone is not enough (sessions refresh silently), so activity is the latest of
--    sign-in, session refresh and the user's own job edits.
--    Read-only; the retention-cleanup edge function decides (dry run by default) what to do with them.
CREATE OR REPLACE FUNCTION public.inactive_user_ids(_inactive_for INTERVAL)
RETURNS TABLE (user_id UUID, last_activity_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH activity AS (
    SELECT u.id,
      GREATEST(
        u.created_at,
        u.last_sign_in_at,
        (SELECT max(s.updated_at) FROM auth.sessions s WHERE s.user_id = u.id),
        (SELECT max(j.updated_at) FROM public.jobs j WHERE j.user_id = u.id)
      ) AS last_activity_at
    FROM auth.users u
  )
  SELECT id, last_activity_at FROM activity
  WHERE last_activity_at < now() - _inactive_for
  ORDER BY last_activity_at;
$$;
REVOKE EXECUTE ON FUNCTION public.inactive_user_ids(INTERVAL) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.inactive_user_ids(INTERVAL) TO service_role;
