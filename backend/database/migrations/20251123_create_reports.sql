-- Migration: Reusable Reporting System (Reports, Reasons, Labels, Events, Attachments)
-- Date: 2025-11-23
-- Compatible with Postgres/Supabase

-- Extensions (for gen_random_uuid)
create extension if not exists pgcrypto;

-- Helper: updatedAt trigger
create or replace function setUpdatedAt()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

-- Enumerations via CHECK (easier to evolve than type enums)
-- status: open -> triage -> in_progress -> resolved | rejected | duplicate
-- event_type: status_change | note | assign | label_add | label_remove | merge | escalate | attachment_add

create table if not exists public.reports (
  "reportId" uuid primary key default gen_random_uuid(),

  -- polymorphic target
  "targetType" text not null check ("targetType" in (
    'auction','auctionItem','order','orderItem','profile','sellerProfile',
    'galleryPost','event','visitBooking','message','comment','marketplaceItem','other'
  )),
  "targetId" uuid not null,

  -- who reported
  "reporterUserId" uuid not null references public.profile("userId") on delete restrict,

  -- optional UI helpers
  "locationPath" text,               -- e.g. /gallery/123 or /auctions/abc
  "reasonSummary" text,              -- short line for quick triage
  "reasonDetails" text,              -- free text details from reporter

  -- state
  status text not null default 'open' check (status in ('open','triage','inProgress','resolved','rejected','duplicate')),
  severity smallint check (severity between 0 and 5),
  "assigneeUserId" uuid references public.profile("userId") on delete set null,
  "duplicateOfReportId" uuid references public.reports("reportId") on delete set null,

  metadata jsonb not null default '{}',

  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index if not exists ux_reports_open_per_reporter_target
on public.reports ("reporterUserId", "targetType", "targetId")
where status in ('open','triage','inProgress');

create index if not exists ix_reports_target on public.reports ("targetType", "targetId");
create index if not exists ix_reports_status on public.reports (status);
create index if not exists ix_reports_createdAt on public.reports ("createdAt" desc);
create index if not exists ix_reports_assignee on public.reports ("assigneeUserId");

-- updatedAt trigger
create trigger trg_reports_setUpdatedAt
before update on public.reports
for each row execute function setUpdatedAt();

create table if not exists public.report_reasons (
  "reasonCode" text primary key,
  description text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.report_reason_links (
  "reportId" uuid not null references public.reports("reportId") on delete cascade,
  "reasonCode" text not null references public.report_reasons("reasonCode") on delete restrict,
  "createdAt" timestamptz not null default now(),
  primary key ("reportId", "reasonCode")
);

create table if not exists public.report_labels (
  "labelId" uuid primary key default gen_random_uuid(),
  key text not null,
  value text,
  color text,
  "createdAt" timestamptz not null default now(),
  unique(key, value)
);

create table if not exists public.report_label_links (
  "reportId" uuid not null references public.reports("reportId") on delete cascade,
  "labelId" uuid not null references public.report_labels("labelId") on delete cascade,
  "createdAt" timestamptz not null default now(),
  primary key ("reportId", "labelId")
);

create table if not exists public.report_attachments (
  "attachmentId" uuid primary key default gen_random_uuid(),
  "reportId" uuid not null references public.reports("reportId") on delete cascade,
  "storagePath" text not null,          -- e.g., bucket/key or signed URL
  "contentType" text,
  "uploadedByUserId" uuid references public.profile("userId") on delete set null,
  "createdAt" timestamptz not null default now()
);
create index if not exists ix_report_attachments_report on public.report_attachments ("reportId");

create table if not exists public.report_events (
  "eventId" uuid primary key default gen_random_uuid(),
  "reportId" uuid not null references public.reports("reportId") on delete cascade,
  "actorUserId" uuid references public.profile("userId") on delete set null,
  "eventType" text not null check ("eventType" in ('status_change','note','assign','label_add','label_remove','merge','escalate','attachment_add')),
  "fromStatus" text,
  "toStatus" text,
  note text,
  metadata jsonb not null default '{}',
  "createdAt" timestamptz not null default now()
);
create index if not exists ix_report_events_report_created on public.report_events ("reportId", "createdAt");

insert into public.report_reasons("reasonCode", description)
values
  ('spam', 'Spam or misleading content'),
  ('harassment', 'Harassment or hate'),
  ('scam', 'Scams or fraud'),
  ('ip_violation', 'Intellectual property violation'),
  ('prohibited_item', 'Prohibited or restricted item'),
  ('fake_item', 'Counterfeit/inauthentic item'),
  ('wrong_category', 'Wrong category / tagging'),
  ('privacy', 'Privacy or personal data exposure'),
  ('other', 'Other')
on conflict ("reasonCode") do nothing;

create or replace view public.report_counts_by_status as
select status, count(*) as count
from public.reports
group by status;

create or replace view public.reports_by_target as
select "targetType", "targetId", count(*) as report_count,
       sum(case when status in ('open','triage','inProgress') then 1 else 0 end) as open_count
from public.reports
group by "targetType", "targetId";
