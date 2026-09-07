create table if not exists public.calendar_events (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,title text not null,event_date date not null,notes text,created_at timestamptz not null default now());
alter table public.calendar_events enable row level security;
create policy "Users manage own calendar events" on public.calendar_events for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create index if not exists calendar_events_user_date_idx on public.calendar_events(user_id,event_date);
