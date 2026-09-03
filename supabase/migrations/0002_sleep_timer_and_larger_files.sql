alter table public.sleep_logs alter column woke_at drop not null;
create unique index sleep_logs_one_active_per_user_idx on public.sleep_logs(user_id) where woke_at is null;
update storage.buckets set file_size_limit = 524288000 where id = 'private-files';
