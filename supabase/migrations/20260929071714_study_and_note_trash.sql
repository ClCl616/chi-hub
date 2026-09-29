-- Additive migration; existing notes and user records stay in place.
alter table public.notes add column deleted_at timestamptz;
create index notes_active_user_idx on public.notes(user_id, updated_at desc) where deleted_at is null;
create index notes_trash_expiry_idx on public.notes(deleted_at) where deleted_at is not null;

create function public.guard_note_trash()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('service_role', 'postgres') then return new; end if;
  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_at := now();
  elsif old.deleted_at is not null then
    if (to_jsonb(new) - 'deleted_at' - 'updated_at') is distinct from
       (to_jsonb(old) - 'deleted_at' - 'updated_at') then
      raise exception 'Restore the note before editing';
    end if;
    if new.deleted_at is null then
      if old.deleted_at <= now() - interval '30 days' then raise exception 'Trash retention expired'; end if;
    elsif new.deleted_at is distinct from old.deleted_at then
      raise exception 'Trash retention cannot be extended';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_note_trash() from public, anon, authenticated;
create trigger guard_note_trash before update on public.notes for each row execute function public.guard_note_trash();

create function public.purge_expired_notes()
returns integer language plpgsql security invoker set search_path = '' as $$
declare removed integer;
begin
  delete from public.notes where deleted_at <= now() - interval '30 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.purge_expired_notes() from public, anon, authenticated;
grant execute on function public.purge_expired_notes() to service_role;

create table public.study_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  content text not null default '' check (char_length(content) <= 20000),
  subject text not null default '일반' check (char_length(subject) between 1 and 60),
  due_date date not null,
  stage integer not null default 0 check (stage between 0 and 6),
  review_count integer not null default 0 check (review_count >= 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,user_id)
);
create index study_items_user_due_idx on public.study_items(user_id,archived,due_date,id);
alter table public.study_items enable row level security;
revoke all on public.study_items from anon;
grant select, insert, update, delete on public.study_items to authenticated;
create policy "Own study items" on public.study_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.study_reviews (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null,
  rating text not null check (rating in ('again','good','easy')),
  reviewed_on date not null,
  next_due_date date not null,
  created_at timestamptz not null default now(),
  foreign key (item_id,user_id) references public.study_items(id,user_id) on delete cascade
);
create index study_reviews_item_user_idx on public.study_reviews(item_id,user_id);
create index study_reviews_user_created_idx on public.study_reviews(user_id,created_at desc);
alter table public.study_reviews enable row level security;
revoke all on public.study_reviews from anon;
grant select, insert on public.study_reviews to authenticated;
create policy "Read own study reviews" on public.study_reviews for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own study reviews" on public.study_reviews for insert to authenticated with check ((select auth.uid()) = user_id);

-- A row lock + expected review count prevents double advancement across tabs.
-- Reuse request_id on network retry so a completed request is idempotent.
create function public.review_study_item(target_id uuid, request_id uuid, expected_count integer, rating text, reviewed_on date)
returns public.study_items language plpgsql security invoker set search_path = '' as $$
declare item public.study_items; previous public.study_reviews; days integer; next_stage integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if rating is null or rating not in ('again','good','easy') or reviewed_on is null or expected_count is null then
    raise exception 'Invalid review';
  end if;
  select * into item from public.study_items where id=target_id and user_id=auth.uid() for update;
  if not found then raise exception 'Study item not found'; end if;
  select * into previous from public.study_reviews where id=request_id and user_id=auth.uid();
  if found then
    if previous.item_id <> target_id then raise exception 'Request ID already used'; end if;
    return item;
  end if;
  if item.archived or item.review_count <> expected_count then raise exception 'Study item changed; refresh and try again'; end if;
  next_stage := case when rating='again' then 0 when rating='easy' then least(item.stage+2,6) else least(item.stage+1,6) end;
  days := case when next_stage=0 then 1 else (array[1,3,7,14,30,60])[next_stage] end;
  update public.study_items set stage=next_stage, review_count=review_count+1,
    due_date=reviewed_on+days, updated_at=now()
    where id=target_id and user_id=auth.uid() returning * into item;
  insert into public.study_reviews(id,user_id,item_id,rating,reviewed_on,next_due_date)
    values(request_id,auth.uid(),target_id,rating,reviewed_on,item.due_date);
  return item;
end;
$$;
revoke all on function public.review_study_item(uuid,uuid,integer,text,date) from public,anon;
grant execute on function public.review_study_item(uuid,uuid,integer,text,date) to authenticated;
