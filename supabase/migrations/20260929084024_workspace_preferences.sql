create table public.workspace_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key in ('favorites','noteFolders','noteOrder','fileOrder')),
  value text[] not null default '{}' check (cardinality(value) <= 5000 and coalesce(array_ndims(value),1) = 1 and array_position(value, null) is null and octet_length(value::text) <= 500000),
  version uuid not null default gen_random_uuid(),
  primary key (user_id, key)
);
alter table public.workspace_preferences enable row level security;
revoke all on public.workspace_preferences from anon, authenticated;
grant select, insert, update on public.workspace_preferences to authenticated;
create policy "Read own workspace preferences" on public.workspace_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own workspace preferences" on public.workspace_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own workspace preferences" on public.workspace_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
