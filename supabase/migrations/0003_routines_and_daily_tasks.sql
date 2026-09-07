alter table public.routines add column if not exists repeat_type text not null default 'daily' check (repeat_type in ('daily','weekly'));
alter table public.routines add column if not exists repeat_days smallint[] not null default '{}';
alter table public.routine_checks add column if not exists completed_at timestamptz;
create table if not exists public.daily_tasks (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,title text not null,task_date date not null default current_date,completed boolean not null default false,completed_at timestamptz,note text,created_at timestamptz not null default now());
alter table public.daily_tasks enable row level security;
create policy "Users manage own daily tasks" on public.daily_tasks for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create index if not exists daily_tasks_user_date_idx on public.daily_tasks(user_id,task_date desc);
