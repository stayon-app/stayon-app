-- StayOn migration 008 — Ops → Dev requests queue (ops files product/bug requests).
-- Run once in Supabase SQL Editor.

create table if not exists dev_requests (
  id uuid primary key default uuid_generate_v4(),
  title text, kind text default 'feature',  -- feature | bug | improvement
  area text, priority text default 'normal',
  detail text, status text default 'open',   -- open | in_dev | shipped | declined
  raised_by uuid, created_at timestamptz not null default now()
);
