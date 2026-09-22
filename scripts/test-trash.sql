-- Run after applying the migration within a transaction, then ROLLBACK.
-- Uses temporary rows only; no user files or Storage objects are modified.
create temporary table trash_guard_test (deleted_at timestamptz, purge_started_at timestamptz);
grant select, insert, update on trash_guard_test to authenticated;
create trigger trash_guard_test before update on trash_guard_test for each row execute function public.guard_file_trash();
insert into trash_guard_test values (null, null);
set local role authenticated;
update trash_guard_test set deleted_at = '2000-01-01';
do $$ begin
  if not exists(select 1 from trash_guard_test where deleted_at = now()) then raise exception 'Client cannot control deletion timestamp'; end if;
end $$;
update trash_guard_test set deleted_at = null;
reset role;
update trash_guard_test set deleted_at = now() - interval '31 days';
set local role authenticated;
do $$ declare rejected boolean := false; begin
  begin update trash_guard_test set deleted_at = null; exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Expired file restore must fail'; end if;
  rejected := false;
  begin update trash_guard_test set purge_started_at = now(); exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'User cannot claim purge'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('authenticated','public.claim_expired_files(integer)','execute') then raise exception 'Authenticated user must not execute purge worker'; end if;
  if has_function_privilege('anon','public.claim_expired_files(integer)','execute') then raise exception 'Anon must not execute purge worker'; end if;
  if not (select relrowsecurity from pg_class where oid='public.files'::regclass) then raise exception 'Files RLS must remain enabled'; end if;
end $$;
select 'PASS: server timestamp, restore deadline, purge claim permissions and existing RLS' as result;
