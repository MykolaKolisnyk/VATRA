-- Disposable CI only. All changes rolled back. Simulated JWT identity, real RLS.
begin;
insert into public.accounts(user_id,vatra_id) values
 ('11111111-1111-4111-8111-111111111111',1001),
 ('22222222-2222-4222-8222-222222222222',1002);
insert into auth.sessions(id,user_id) values
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111');
insert into public.feed_posts values(1);
insert into public.avatar_photo_tags values(1);
insert into storage.objects values(1);
-- The helper is deliberately not an author-visibility or anonymous-access policy.
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if not vatra_security_private.allowed() or (select count(*) from public.feed_posts)<>1
  or (select count(*) from public.avatar_photo_tags)<>1 or (select count(*) from storage.objects)<>1 then
  raise exception 'Active member lost access';
 end if;
end $$;
reset role;
select public.vatra_account_lifecycle_transition('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','request_deletion',7);
set local role authenticated;
do $$ declare rel text; affected bigint; begin
 if vatra_security_private.allowed() then raise exception 'Pending member allowed'; end if;
 foreach rel in array array['public.feed_posts','public.avatar_photo_tags','storage.objects'] loop
  execute format('select count(*) from %s',rel) into affected;
  if affected<>0 then raise exception 'Pending account can read %',rel; end if;
  begin
   execute format('insert into %s values(2)',rel);
   raise exception 'Pending account can insert into %',rel;
  exception when insufficient_privilege then null; end;
  execute format('update %s set id=3 where id=1',rel);
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Pending account can update %',rel; end if;
  execute format('delete from %s where id=1',rel);
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Pending account can delete %',rel; end if;
 end loop;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if not vatra_security_private.allowed() or (select count(*) from public.feed_posts)<>1 then
  raise exception 'Unrelated active member affected';
 end if;
end $$;
reset role;
select public.vatra_account_lifecycle_transition('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','restore');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if not vatra_security_private.allowed() or (select count(*) from storage.objects)<>1
  or (select count(*) from public.avatar_photo_tags)<>1 then raise exception 'Restored access missing'; end if;
end $$;
reset role;
insert into public.account_states values(1001,'blocked',null);
set local role authenticated;
do $$ begin if vatra_security_private.allowed() then raise exception 'Moderation bypass'; end if; end $$;
reset role;
update public.account_states set blocked_until=now()-interval '1 day' where vatra_id=1001;
set local role authenticated;
do $$ begin if not vatra_security_private.allowed() then raise exception 'Expired moderation block changed'; end if; end $$;
reset role;
select public.vatra_account_lifecycle_transition('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','request_deletion',7);
update private.vatra_account_deletion_jobs set requested_at=now()-interval '8 days',restore_until=now()-interval '1 day';
set local role authenticated;
do $$ begin if vatra_security_private.allowed() then raise exception 'Expired pending account allowed'; end if; end $$;
reset role;
select * from public.vatra_account_lifecycle_claim(1);
set local role authenticated;
do $$ begin if vatra_security_private.allowed() then raise exception 'Purging account allowed'; end if; end $$;
reset role;
rollback;
