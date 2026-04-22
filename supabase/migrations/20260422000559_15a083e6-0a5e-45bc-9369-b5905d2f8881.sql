-- Add 'archived' to the job_status enum if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'archived'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'job_status')
  ) THEN
    ALTER TYPE job_status ADD VALUE 'archived';
  END IF;
END $$;

-- Add archive metadata columns
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS archive_type text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejection_tag text,
  ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS previous_status job_status;

-- Constrain archive_type to known values (allow null for non-archived rows)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_archive_type_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_archive_type_check
      CHECK (archive_type IS NULL OR archive_type IN ('closed','rejected','ghosted'));
  END IF;
END $$;