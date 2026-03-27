-- ============================================
-- EPOXY ESTIMATOR v2 — Run this in SQL Editor
-- ============================================
-- Run AFTER the original supabase-setup.sql
-- If you already ran setup, this just adds the saved_estimates table.
-- ============================================

create table if not exists saved_estimates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Untitled Estimate',
  customer_name text default '',
  settings_data jsonb,
  systems_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table saved_estimates enable row level security;

create policy "Users read own estimates" on saved_estimates for select using (auth.uid() = user_id);
create policy "Users insert own estimates" on saved_estimates for insert with check (auth.uid() = user_id);
create policy "Users update own estimates" on saved_estimates for update using (auth.uid() = user_id);
create policy "Users delete own estimates" on saved_estimates for delete using (auth.uid() = user_id);

create trigger saved_estimates_updated_at
  before update on saved_estimates
  for each row execute function update_updated_at();
