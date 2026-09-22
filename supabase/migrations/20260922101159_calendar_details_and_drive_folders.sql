alter table public.calendar_events
  add column all_day boolean not null default true,
  add column start_time time,
  add column end_time time,
  add column color text not null default '#6b8e23' check (color ~ '^#[0-9a-fA-F]{6}$'),
  add column location text not null default '',
  add column repeat text not null default 'none' check (repeat in ('none','daily','weekly','monthly','yearly')),
  add column repeat_until date,
  add constraint calendar_times check (all_day or (start_time is not null and end_time is not null and end_time > start_time)),
  add constraint calendar_repeat_end check (repeat_until is null or repeat_until >= event_date);

create table public.drive_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid,
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  trash_root_id uuid,
  unique(id,user_id),
  foreign key(parent_id,user_id) references public.drive_folders(id,user_id)
);
alter table public.drive_folders enable row level security;
create policy folders_owner on public.drive_folders for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.drive_folders to authenticated, service_role;
create index drive_folders_parent_idx on public.drive_folders(user_id,parent_id);
alter table public.files add column folder_id uuid, add column trash_root_id uuid,
  add constraint files_folder_owner foreign key(folder_id,user_id) references public.drive_folders(id,user_id);
create index files_folder_idx on public.files(user_id,folder_id);

-- Serialize tree mutations per owner, including uploads racing with a folder deletion.
create function public.guard_drive_tree() returns trigger language plpgsql security invoker set search_path='' as $$
declare parent uuid; target uuid; depth integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
  if tg_table_name='drive_folders' then
    parent:=new.parent_id;
    if tg_op='UPDATE' then
      if new.user_id<>old.user_id then raise exception 'Cannot change owner'; end if;
      if old.deleted_at is null and new.deleted_at is not null and current_user not in ('service_role','postgres') then new.deleted_at:=now(); end if;
      if old.deleted_at is not null and new.deleted_at is null and old.deleted_at<=now()-interval '30 days' then raise exception 'Trash retention expired'; end if;
      if old.deleted_at is not null and new.deleted_at is not null and old.deleted_at<>new.deleted_at then raise exception 'Cannot extend retention'; end if;
    end if;
  else parent:=new.folder_id;
  end if;
  target:=parent;
    while target is not null loop
      depth:=depth+1;
      if depth>32 or (tg_table_name='drive_folders' and target=new.id) then raise exception 'Invalid folder hierarchy'; end if;
      select f.parent_id into target from public.drive_folders f where f.id=target and f.user_id=new.user_id and (new.deleted_at is not null or f.deleted_at is null);
      if not found then raise exception 'Destination folder unavailable'; end if;
    end loop;
  return new;
end; $$;
revoke all on function public.guard_drive_tree() from public,anon,authenticated;
create trigger drive_folder_guard before insert or update on public.drive_folders for each row execute function public.guard_drive_tree();
create trigger drive_file_guard before insert or update on public.files for each row execute function public.guard_drive_tree();

create function public.trash_drive_folder(folder uuid, restore boolean default false) returns void language plpgsql security invoker set search_path='' as $$
declare owner uuid := auth.uid(); root public.drive_folders; item record;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
  select * into root from public.drive_folders where id=folder and user_id=owner for update;
  if not found then raise exception 'Folder unavailable'; end if;
  if restore then
    if root.deleted_at is null or root.trash_root_id<>root.id or root.deleted_at<=now()-interval '30 days' then raise exception 'Folder cannot be restored'; end if;
    -- Parents before children; expired/claimed files cause atomic rollback.
    for item in with recursive tree as (
      select f.id,0 as depth from public.drive_folders f where f.id=folder
      union all select f.id,t.depth+1 from public.drive_folders f join tree t on f.parent_id=t.id where f.trash_root_id=folder and f.user_id=owner
    ) select * from tree order by depth loop
      update public.drive_folders set deleted_at=null,trash_root_id=null,
        parent_id=case when id=folder and not exists(select 1 from public.drive_folders p where p.id=root.parent_id and p.deleted_at is null) then null else parent_id end
      where id=item.id and user_id=owner;
    end loop;
    update public.files set deleted_at=null,trash_root_id=null where trash_root_id=folder and user_id=owner;
  else
    if root.deleted_at is not null then raise exception 'Folder already in trash'; end if;
    with recursive tree as (
      select id from public.drive_folders where id=folder
      union all select f.id from public.drive_folders f join tree t on f.parent_id=t.id where f.deleted_at is null and f.user_id=owner
    ) update public.files set deleted_at=now(),trash_root_id=folder where folder_id in(select id from tree) and user_id=owner and deleted_at is null;
    with recursive tree as (
      select id from public.drive_folders where id=folder
      union all select f.id from public.drive_folders f join tree t on f.parent_id=t.id where f.deleted_at is null and f.user_id=owner
    ) update public.drive_folders set deleted_at=now(),trash_root_id=folder where id in(select id from tree) and user_id=owner;
  end if;
end; $$;
revoke all on function public.trash_drive_folder(uuid,boolean) from public,anon;
grant execute on function public.trash_drive_folder(uuid,boolean) to authenticated;

create function public.purge_expired_folders() returns integer language plpgsql security invoker set search_path='' as $$
declare removed integer; total integer:=0;
begin
  for i in 1..33 loop
    delete from public.drive_folders f where f.deleted_at<=now()-interval '30 days'
      and not exists(select 1 from public.files x where x.folder_id=f.id)
      and not exists(select 1 from public.drive_folders x where x.parent_id=f.id);
    get diagnostics removed=row_count; total:=total+removed;
    exit when removed=0;
  end loop;
  return total;
end; $$;
revoke all on function public.purge_expired_folders() from public,anon,authenticated;
grant execute on function public.purge_expired_folders() to service_role;
