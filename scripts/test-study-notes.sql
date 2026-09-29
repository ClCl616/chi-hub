-- Synthetic accounts only. Always run the ENTIRE file, including BEGIN/ROLLBACK.
begin;
select set_config('qa.owner', gen_random_uuid()::text, true),
       set_config('qa.other', gen_random_uuid()::text, true),
       set_config('qa.item', gen_random_uuid()::text, true),
       set_config('qa.note', gen_random_uuid()::text, true),
       set_config('qa.request', gen_random_uuid()::text, true);
insert into auth.users(id) values (current_setting('qa.owner')::uuid), (current_setting('qa.other')::uuid);
select set_config('request.jwt.claim.sub', current_setting('qa.owner'), true);
set local role authenticated;
insert into public.notes(id,user_id,title,content) values(current_setting('qa.note')::uuid,auth.uid(),'QA rollback note','Keep this content');
insert into public.study_items(id,user_id,title,content,subject,due_date)
values(current_setting('qa.item')::uuid,auth.uid(),'QA rollback study','Answer','QA','2026-09-29');
do $$
declare item public.study_items;
begin
  item := public.review_study_item(current_setting('qa.item')::uuid,current_setting('qa.request')::uuid,0,'good','2026-09-29');
  if item.review_count <> 1 or item.due_date <> '2026-09-30' or item.stage <> 1 then raise exception 'First review failed'; end if;
  item := public.review_study_item(current_setting('qa.item')::uuid,current_setting('qa.request')::uuid,0,'good','2026-09-29');
  if item.review_count <> 1 then raise exception 'Duplicate review advanced twice'; end if;
  begin
    perform public.review_study_item(current_setting('qa.item')::uuid,gen_random_uuid(),0,'easy','2026-09-29');
    raise exception 'Stale review accepted';
  exception when others then if sqlerrm='Stale review accepted' then raise; end if; end;
  item := public.review_study_item(current_setting('qa.item')::uuid,gen_random_uuid(),1,'easy','2026-09-30');
  if item.stage <> 3 or item.due_date <> '2026-10-07' then raise exception 'Easy interval failed'; end if;
  item := public.review_study_item(current_setting('qa.item')::uuid,gen_random_uuid(),2,'again','2026-10-07');
  if item.stage <> 0 or item.due_date <> '2026-10-08' then raise exception 'Relearn interval failed'; end if;
  update public.study_items set archived=true where id=current_setting('qa.item')::uuid;
  begin
    perform public.review_study_item(current_setting('qa.item')::uuid,gen_random_uuid(),3,'good','2026-10-08');
    raise exception 'Archived review accepted';
  exception when others then if sqlerrm='Archived review accepted' then raise; end if; end;
  update public.notes set deleted_at=now() where id=current_setting('qa.note')::uuid;
  begin
    update public.notes set content='Unwanted autosave' where id=current_setting('qa.note')::uuid;
    raise exception 'Trash edit accepted';
  exception when others then if sqlerrm='Trash edit accepted' then raise; end if; end;
  begin
    update public.notes set deleted_at=now()+interval '1 day' where id=current_setting('qa.note')::uuid;
    raise exception 'Retention extension accepted';
  exception when others then if sqlerrm='Retention extension accepted' then raise; end if; end;
  update public.notes set deleted_at=null where id=current_setting('qa.note')::uuid;
  if not exists(select 1 from public.notes where id=current_setting('qa.note')::uuid and deleted_at is null and content='Keep this content') then raise exception 'Restore lost content'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('qa.other'),true);
do $$ begin
  if exists(select 1 from public.study_items where id=current_setting('qa.item')::uuid) or
     exists(select 1 from public.study_reviews where item_id=current_setting('qa.item')::uuid) or
     exists(select 1 from public.notes where id=current_setting('qa.note')::uuid) then raise exception 'Cross-user read leak'; end if;
  begin
    perform public.review_study_item(current_setting('qa.item')::uuid,gen_random_uuid(),3,'good','2026-10-08');
    raise exception 'Cross-user review accepted';
  exception when others then if sqlerrm='Cross-user review accepted' then raise; end if; end;
  begin
    insert into public.study_reviews(id,user_id,item_id,rating,reviewed_on,next_due_date)
    values(gen_random_uuid(),auth.uid(),current_setting('qa.item')::uuid,'good','2026-09-29','2026-09-30');
    raise exception 'Cross-user history accepted';
  exception when foreign_key_violation then null; end;
  if has_function_privilege('authenticated','public.purge_expired_notes()','execute') or
     has_function_privilege('anon','public.review_study_item(uuid,uuid,integer,text,date)','execute') then raise exception 'RPC privilege leak'; end if;
end $$;
reset role;
update public.notes set deleted_at=now()-interval '31 days' where id=current_setting('qa.note')::uuid;
select set_config('request.jwt.claim.sub', current_setting('qa.owner'), true);
set local role authenticated;
do $$ begin
  begin
    update public.notes set deleted_at=null where id=current_setting('qa.note')::uuid;
    raise exception 'Expired restore accepted';
  exception when others then if sqlerrm='Expired restore accepted' then raise; end if; end;
  begin
    update public.study_items set user_id=current_setting('qa.other')::uuid where id=current_setting('qa.item')::uuid;
    raise exception 'Owner reassignment accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: review intervals, idempotency, stale writes, archive, note trash/restore/expiry, cross-user RLS and RPC grants; all synthetic data rolled back' as result;
rollback;
