-- Run the entire transaction. No real account or preferences are modified.
begin;
select set_config('qa.owner', gen_random_uuid()::text, true), set_config('qa.other', gen_random_uuid()::text, true);
insert into auth.users(id) values (current_setting('qa.owner')::uuid), (current_setting('qa.other')::uuid);
select set_config('request.jwt.claim.sub', current_setting('qa.owner'), true);
set local role authenticated;
insert into public.workspace_preferences(user_id,key,value) values(auth.uid(),'favorites',array['notes']), (auth.uid(),'noteOrder',array[gen_random_uuid()::text]);
do $$
declare old_version uuid; changed int;
begin
  select version into old_version from public.workspace_preferences where user_id=auth.uid() and key='favorites';
  update public.workspace_preferences set value=array['notes','files'],version=gen_random_uuid() where user_id=auth.uid() and key='favorites' and version=old_version;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'Owner update failed'; end if;
  update public.workspace_preferences set value=array['study'] where user_id=auth.uid() and key='favorites' and version=old_version;
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'Stale revision overwrote values'; end if;
  begin
    insert into public.workspace_preferences(user_id,key,value) values(current_setting('qa.other')::uuid,'favorites',array['notes']);
    raise exception 'Foreign insert accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.workspace_preferences set user_id=current_setting('qa.other')::uuid where key='favorites';
    raise exception 'Owner reassignment accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', current_setting('qa.other'), true);
do $$ begin
  if exists(select 1 from public.workspace_preferences) then raise exception 'Foreign read accepted'; end if;
  update public.workspace_preferences set value='{}';
  if found then raise exception 'Foreign update accepted'; end if;
end $$;
reset role;
do $$ begin
  if has_table_privilege('anon','public.workspace_preferences','select') or has_table_privilege('anon','public.workspace_preferences','insert') or has_table_privilege('anon','public.workspace_preferences','update') then raise exception 'Anonymous grant present'; end if;
  if has_table_privilege('authenticated','public.workspace_preferences','delete') then raise exception 'Unexpected delete grant'; end if;
end $$;
rollback;
