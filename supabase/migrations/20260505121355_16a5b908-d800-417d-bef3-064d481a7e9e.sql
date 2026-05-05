
-- has_role is called from RLS policies evaluated as the authenticated role; restore EXECUTE
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
