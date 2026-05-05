
-- 1. Restrict profiles SELECT to owner only
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated (PostgREST exposure)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- 3. Realtime channel authorization: restrict subscriptions to user-scoped topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to own jobs channel" ON realtime.messages;
CREATE POLICY "Users can subscribe to own jobs channel"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.topic() = 'jobs-' || auth.uid()::text
    OR realtime.topic() LIKE 'cv-versions-' || auth.uid()::text || '-%'
  );
