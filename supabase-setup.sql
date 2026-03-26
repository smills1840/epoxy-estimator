-- ============================================
-- EPOXY FLOOR ESTIMATOR — Supabase Setup
-- ============================================
-- Run this ONCE in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- 1. Epoxy systems table (one row per user)
create table if not exists user_systems (
  user_id uuid references auth.users(id) on delete cascade primary key,
  data jsonb,
  updated_at timestamptz default now()
);

-- 2. Estimator settings table (one row per user)
create table if not exists user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  data jsonb,
  updated_at timestamptz default now()
);

-- 3. Enable Row Level Security
alter table user_systems enable row level security;
alter table user_settings enable row level security;

-- 4. RLS Policies — users can ONLY access their own row
create policy "Users read own systems" on user_systems for select using (auth.uid() = user_id);
create policy "Users insert own systems" on user_systems for insert with check (auth.uid() = user_id);
create policy "Users update own systems" on user_systems for update using (auth.uid() = user_id);
create policy "Users delete own systems" on user_systems for delete using (auth.uid() = user_id);

create policy "Users read own settings" on user_settings for select using (auth.uid() = user_id);
create policy "Users insert own settings" on user_settings for insert with check (auth.uid() = user_id);
create policy "Users update own settings" on user_settings for update using (auth.uid() = user_id);
create policy "Users delete own settings" on user_settings for delete using (auth.uid() = user_id);

-- 5. Auto-update timestamps
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_systems_updated_at
  before update on user_systems
  for each row execute function update_updated_at();

create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at();

-- Done! Now go to:
--   Authentication → Providers → make sure Email is enabled
--   Authentication → Settings → (optional) disable "Confirm email" for testing
