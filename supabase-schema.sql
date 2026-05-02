-- Run this in Supabase SQL Editor

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  keywords text[] default '{}',
  is_own boolean default false,
  created_at timestamptz default now()
);

create table queries (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text,
  active boolean default true,
  created_at timestamptz default now()
);

create table scan_results (
  id uuid primary key default gen_random_uuid(),
  query_id uuid references queries(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  engine text not null,
  mentioned boolean default false,
  mention_count int default 0,
  response_excerpt text,
  ran_at timestamptz default now()
);

-- Index for fast dashboard queries
create index on scan_results (brand_id, engine);
create index on scan_results (ran_at desc);
