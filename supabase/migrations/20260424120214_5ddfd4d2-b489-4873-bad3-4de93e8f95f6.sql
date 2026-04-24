-- CV Versions table
CREATE TABLE public.cv_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cv_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cv versions"
  ON public.cv_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own cv versions"
  ON public.cv_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own cv versions"
  ON public.cv_versions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own cv versions"
  ON public.cv_versions FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_cv_versions_updated_at
  BEFORE UPDATE ON public.cv_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link jobs -> cv_version
ALTER TABLE public.jobs
  ADD COLUMN cv_version_id UUID REFERENCES public.cv_versions(id) ON DELETE SET NULL;

CREATE INDEX idx_jobs_cv_version_id ON public.jobs(cv_version_id);