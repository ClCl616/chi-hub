alter table public.files add column deleted_at timestamptz;
alter table public.files add column purge_started_at timestamptz;
create index files_trash_expiry_idx on public.files(deleted_at) where deleted_at is not null;

create function public.guard_file_trash()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('service_role', 'postgres') then return new; end if;
  if new.purge_started_at is distinct from old.purge_started_at or old.purge_started_at is not null then
    raise exception 'This file is being permanently deleted';
  end if;
  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_at := now();
  elsif old.deleted_at is not null and new.deleted_at is null then
    if old.deleted_at <= now() - interval '30 days' then raise exception 'Trash retention expired'; end if;
  elsif old.deleted_at is distinct from new.deleted_at then
    raise exception 'Trash retention cannot be extended';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_file_trash() from public, anon, authenticated;
create trigger guard_file_trash before update on public.files for each row execute function public.guard_file_trash();

-- A claim prevents restoration while the Storage API is deleting bytes.
-- The worker retries claimed records after an interrupted run.
create function public.claim_expired_files(batch_size integer default 100)
returns table(id uuid, storage_path text)
language sql security invoker set search_path = '' as $$
  update public.files set purge_started_at = now()
  where files.id in (
    select f.id from public.files f
    where f.deleted_at <= now() - interval '30 days'
      and (f.purge_started_at is null or f.purge_started_at < now() - interval '15 minutes')
    order by f.deleted_at
    limit least(greatest(batch_size, 1), 100)
    for update skip locked
  ) returning files.id, files.storage_path;
$$;
revoke all on function public.claim_expired_files(integer) from public, anon, authenticated;
grant execute on function public.claim_expired_files(integer) to service_role;
