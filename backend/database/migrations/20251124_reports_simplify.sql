-- Simplify reports schema to single-table design
-- Aligns with frontend and controller usage (reason, details)
-- Reporter FK -> auth.users(id)

begin;

-- 1) Ensure core table exists; if already exists, we'll alter it below.
create extension if not exists pgcrypto;
create table if not exists public.reports (
  "reportId" uuid primary key default gen_random_uuid(),
  "targetType" text not null,
  "targetId" uuid not null,
  "reporterUserId" uuid not null references auth.users(id) on delete restrict,
  "reason" text,
  "details" text,
  status text not null default 'open',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- 2) Rename rich columns to simple ones, if present
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='reports' AND column_name='reasonSummary'
  ) THEN
    ALTER TABLE public.reports RENAME COLUMN "reasonSummary" TO "reason";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='reports' AND column_name='reasonDetails'
  ) THEN
    ALTER TABLE public.reports RENAME COLUMN "reasonDetails" TO "details";
  END IF;
END $$;

-- 3) Add simple columns if missing
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS "reason" text,
  ADD COLUMN IF NOT EXISTS "details" text,
  ADD COLUMN IF NOT EXISTS status text not null default 'open',
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz not null default now(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz not null default now();

-- 4) Drop extra columns from rich schema if present
ALTER TABLE public.reports 
  DROP COLUMN IF EXISTS "assigneeUserId",
  DROP COLUMN IF EXISTS "duplicateOfReportId",
  DROP COLUMN IF EXISTS severity,
  DROP COLUMN IF EXISTS metadata;

-- 5) Drop CHECK constraints (targetType/status enumerations) to keep schema flexible
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint 
           WHERE conrelid = 'public.reports'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.reports DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 6) Ensure FK to auth.users(id)
DO $$ BEGIN
  BEGIN
    ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporterUserId_auth_fkey;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;
  BEGIN
    ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporterUserId_fkey;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;
  ALTER TABLE public.reports
    ADD CONSTRAINT reports_reporterUserId_auth_fkey
    FOREIGN KEY ("reporterUserId") REFERENCES auth.users(id) ON DELETE RESTRICT;
END $$;

-- 7) Drop rich auxiliary tables if they exist
DROP TABLE IF EXISTS public.report_reason_links;
DROP TABLE IF EXISTS public.report_reasons;
DROP TABLE IF EXISTS public.report_label_links;
DROP TABLE IF EXISTS public.report_labels;
DROP TABLE IF EXISTS public.report_attachments;
DROP TABLE IF EXISTS public.report_events;

-- 8) Recreate simple indexes
create index if not exists ix_reports_target
  on public.reports ("targetType","targetId");

create index if not exists ix_reports_status
  on public.reports (status);

create index if not exists ix_reports_createdAt
  on public.reports ("createdAt" desc);

create index if not exists ix_reports_reporter
  on public.reports ("reporterUserId");

create unique index if not exists ux_reports_open_per_reporter_target
  on public.reports ("reporterUserId","targetType","targetId")
  where status in ('open','triage','inProgress');

commit;
