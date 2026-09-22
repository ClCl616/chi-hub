-- Run inside a transaction after the migration, then ROLLBACK. Synthetic rows only.
create temp table qa_drive_ids as select gen_random_uuid() as owner,gen_random_uuid() as other,gen_random_uuid() as root,gen_random_uuid() as child,gen_random_uuid() as file;
grant select on qa_drive_ids to authenticated;
insert into auth.users(id) select owner from qa_drive_ids union all select other from qa_drive_ids;
select set_config('request.jwt.claim.sub',(select owner::text from qa_drive_ids),true);
set local role authenticated;
insert into public.drive_folders(id,user_id,name) select root,owner,'QA root' from qa_drive_ids;
insert into public.drive_folders(id,user_id,parent_id,name) select child,owner,root,'QA child' from qa_drive_ids;
insert into public.files(id,user_id,name,storage_path,folder_id) select file,owner,'QA file','qa-rollback/'||file,child from qa_drive_ids;
do $$ begin
  begin update public.drive_folders set parent_id=(select child from qa_drive_ids) where id=(select root from qa_drive_ids); raise exception 'cycle accepted'; exception when others then if sqlerrm='cycle accepted' then raise; end if; end;
  perform public.trash_drive_folder((select root from qa_drive_ids),false);
  if (select count(*) from public.drive_folders where deleted_at is not null and user_id=(select owner from qa_drive_ids))<>2 then raise exception 'tree trash failed'; end if;
  if not exists(select 1 from public.files where id=(select file from qa_drive_ids) and deleted_at is not null) then raise exception 'file trash failed'; end if;
  begin insert into public.files(user_id,name,storage_path,folder_id) select owner,'bad','qa-rejected/'||file,child from qa_drive_ids; raise exception 'trash upload accepted'; exception when others then if sqlerrm='trash upload accepted' then raise; end if; end;
  perform public.trash_drive_folder((select root from qa_drive_ids),true);
  if exists(select 1 from public.files where id=(select file from qa_drive_ids) and deleted_at is not null) then raise exception 'restore failed'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select other::text from qa_drive_ids),true);
do $$ begin
  if exists(select 1 from public.drive_folders where id=(select root from qa_drive_ids)) then raise exception 'RLS read leak'; end if;
  begin insert into public.drive_folders(user_id,parent_id,name) select other,root,'Invalid cross-owner' from qa_drive_ids; raise exception 'cross-owner accepted'; exception when others then if sqlerrm='cross-owner accepted' then raise; end if; end;
  begin perform public.trash_drive_folder((select root from qa_drive_ids),false); raise exception 'RLS write leak'; exception when others then if sqlerrm='RLS write leak' then raise; end if; end;
end $$;
reset role;
select 'PASS: hierarchy, recursive trash/restore, deleted destination, cross-owner RLS' as result;
