-- VATRA permissions, verification and trusted notices. 2026-10-31.
-- APPLY AFTER app-data-schema.sql, vatra-unique-handles-verification.sql,
-- and vatra-moderation-center.sql. Run through Supabase SQL Editor.
-- No user is made owner automatically. Enroll the founder's UUID after applying.
begin;
create table if not exists public.vatra_network_owners(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.vatra_network_owners enable row level security;
revoke all on public.vatra_network_owners from public,anon,authenticated;
-- Only SQL Editor/postgres may bootstrap or change network owners.

create table if not exists public.vatra_staff_members(
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','moderator','support','verifier')),
 appointed_by uuid, appointed_at timestamptz not null default now()
);
alter table public.vatra_staff_members enable row level security;
revoke all on public.vatra_staff_members from public,anon,authenticated;
grant select on public.vatra_staff_members to authenticated;

create or replace function public.vatra_staff_role()
returns text language sql stable security definer
set search_path='' set row_security=off as $role$
 select case
 when auth.uid() is null then null
 when exists(select 1 from public.vatra_network_owners o where o.user_id=auth.uid()) then 'owner'
 else (select s.role from public.vatra_staff_members s where s.user_id=auth.uid())
 end;
$role$;
revoke all on function public.vatra_staff_role() from public,anon;
grant execute on function public.vatra_staff_role() to authenticated;

create or replace function public.vatra_has_permission(_action text)
returns boolean language sql stable security definer
set search_path='' set row_security=off as $permission$
 select coalesce(
 case public.vatra_staff_role()
 when 'owner' then _action in ('staff','ban_account','ban_group','hide_content','review_report','verify','review_verification','view_reports')
 when 'admin' then _action in ('ban_account','ban_group','hide_content','review_report','verify','review_verification','view_reports')
 when 'moderator' then _action in ('hide_content','review_report','view_reports')
 when 'support' then _action in ('review_report','view_reports')
 when 'verifier' then _action in ('verify','review_verification')
 else false end,false);
$permission$;
revoke all on function public.vatra_has_permission(text) from public,anon;
grant execute on function public.vatra_has_permission(text) to authenticated;

drop policy if exists vatra_staff_read on public.vatra_staff_members;
create policy vatra_staff_read on public.vatra_staff_members
for select to authenticated using(user_id=auth.uid() or public.vatra_has_permission('staff'));

create or replace function public.vatra_owner_set_staff(_uid uuid,_role text)
returns jsonb language plpgsql security definer
set search_path='' set row_security=off as $staff$
begin
 if not public.vatra_has_permission('staff') then raise exception 'Only VATRA owner may manage staff.'; end if;
 if _uid is null or not exists(select 1 from auth.users u where u.id=_uid) then raise exception 'User UID not found.'; end if;
 if exists(select 1 from public.vatra_network_owners where user_id=_uid) then raise exception 'Cannot change a founder role.'; end if;
 if _role is not null and _role not in ('admin','moderator','support','verifier') then raise exception 'Invalid role.'; end if;
 if _role is null then
   delete from public.vatra_staff_members where user_id=_uid;
 else
   insert into public.vatra_staff_members(user_id,role,appointed_by)
   values(_uid,_role,auth.uid())
   on conflict(user_id) do update set role=excluded.role,appointed_by=auth.uid(),appointed_at=now();
 end if;
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),'staff_role',_uid::text,jsonb_build_object('role',_role));
 insert into public.vatra_verified_notices(recipient_uid,kind,title,body,target_kind,target_id)
 values(_uid,case when _role is null then 'staff_removed' else 'staff_appointed' end,
 case when _role is null then 'Права працівника відкликано' else 'Вам надано роль у ВАТРІ' end,
 case when _role is null then 'Власник ВАТРИ відкликав Ваші адміністративні повноваження.'
 else 'Власник ВАТРИ призначив Вам посаду: '||_role||'. Доступні лише дозволені Вашою роллю функції.' end,
 'account',_uid::text);
 return jsonb_build_object('uid',_uid,'role',_role);
end $staff$;
revoke all on function public.vatra_owner_set_staff(uuid,text) from public,anon;
grant execute on function public.vatra_owner_set_staff(uuid,text) to authenticated;

-- Previously installed administrator APIs must be checked by the NEW staff role.
create or replace function public.vatra_is_verification_admin()
returns boolean language sql stable security definer
set search_path='' set row_security=off as $fn$
 select public.vatra_has_permission('verify');
$fn$;
create or replace function public.vatra_moderation_is_admin()
returns boolean language sql stable security definer
set search_path='' set row_security=off as $fn$
 select public.vatra_has_permission('view_reports');
$fn$;

create table if not exists public.vatra_verified_groups(
 group_id text primary key,
 verified boolean not null default true,
 updated_by uuid,
 updated_at timestamptz not null default now()
);
alter table public.vatra_verified_groups enable row level security;
revoke all on public.vatra_verified_groups from public,anon,authenticated;
grant select on public.vatra_verified_groups to anon,authenticated;
drop policy if exists vatra_verified_groups_read on public.vatra_verified_groups;
create policy vatra_verified_groups_read on public.vatra_verified_groups for select
to anon,authenticated using(verified=true);

create table if not exists public.vatra_verification_requests(
 id bigint generated always as identity primary key,
 applicant_uid uuid not null references auth.users(id) on delete cascade,
 target_kind text not null check(target_kind in ('account','community')),
 target_id text not null,
 explanation text not null,
 reference_url text,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 response text not null default '',
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index if not exists vatra_verification_unique_pending
on public.vatra_verification_requests(target_kind,target_id) where status='pending';
create index if not exists vatra_verification_requests_recent on public.vatra_verification_requests(created_at desc);
alter table public.vatra_verification_requests enable row level security;
revoke all on public.vatra_verification_requests from public,anon,authenticated;
grant select on public.vatra_verification_requests to authenticated;
drop policy if exists vatra_verification_requests_select on public.vatra_verification_requests;
create policy vatra_verification_requests_select on public.vatra_verification_requests
 for select to authenticated
 using(applicant_uid=auth.uid() or public.vatra_has_permission('review_verification'));

create table if not exists public.vatra_verified_notices(
 id bigint generated always as identity primary key,
 recipient_uid uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('account_verified','community_verified','verification_rejected','staff_appointed','staff_removed')),
 title text not null,
 body text not null,
 target_kind text,
 target_id text,
 created_at timestamptz not null default now()
);
create index if not exists vatra_verified_notice_recipient on public.vatra_verified_notices(recipient_uid,created_at desc);
alter table public.vatra_verified_notices enable row level security;
revoke all on public.vatra_verified_notices from public,anon,authenticated;
grant select on public.vatra_verified_notices to authenticated;
drop policy if exists vatra_verified_notices_read on public.vatra_verified_notices;
create policy vatra_verified_notices_read on public.vatra_verified_notices
 for select to authenticated using(recipient_uid=auth.uid());

create or replace function public.vatra_submit_verification(
 _kind text,_target text,_explanation text,_url text default null)
returns bigint language plpgsql security definer
set search_path='' set row_security=off as $apply$
declare target_uid uuid; new_id bigint; target_group jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to apply.'; end if;
 if _kind not in ('account','community') then raise exception 'Invalid verification type.'; end if;
 if length(btrim(coalesce(_explanation,'')))<30 or length(_explanation)>2000
 then raise exception 'Explain why verification is needed (30–2000 characters).'; end if;
 if coalesce(_url,'')<>'' and (_url !~ '^https://[^[:space:]]{4,400}$')
 then raise exception 'Use an HTTPS reference link.'; end if;
 if _kind='account' then
   if _target<>auth.uid()::text then raise exception 'You can only apply for your own account.'; end if;
   if exists(select 1 from public.app_data where path='verifiedUsers/'||auth.uid()::text and value->>'verified'='true')
   then raise exception 'Account already verified.'; end if;
 else
   if coalesce(_target,'') !~ '^[A-Za-z0-9_-]{1,128}$' then raise exception 'Invalid community ID.'; end if;
   select g.value into target_group from public.app_data g where g.path='groups/'||_target;
   if target_group is null or target_group->>'ownerUid'<>auth.uid()::text
   then raise exception 'Only community owner can request verification.'; end if;
   if exists(select 1 from public.vatra_verified_groups where group_id=_target and verified)
   then raise exception 'Community already verified.'; end if;
 end if;
 insert into public.vatra_verification_requests(applicant_uid,target_kind,target_id,explanation,reference_url)
 values(auth.uid(),_kind,_target,btrim(_explanation),nullif(btrim(coalesce(_url,'')),''))
 returning id into new_id;
 return new_id;
end $apply$;
revoke all on function public.vatra_submit_verification(text,text,text,text) from public,anon;
grant execute on function public.vatra_submit_verification(text,text,text,text) to authenticated;

create or replace function public.vatra_verify_group(_group text,_verified boolean default true)
returns jsonb language plpgsql security definer
set search_path='' set row_security=off as $verify$
declare group_info jsonb; recipient uuid;
begin
 if not public.vatra_has_permission('verify') then raise exception 'Verification permission required.'; end if;
 select value into group_info from public.app_data where path='groups/'||_group;
 if group_info is null then raise exception 'Community not found.'; end if;
 recipient := nullif(group_info->>'ownerUid','')::uuid;
 insert into public.vatra_verified_groups(group_id,verified,updated_by)
 values(_group,_verified,auth.uid())
 on conflict(group_id) do update set verified=excluded.verified,updated_by=auth.uid(),updated_at=now();
 if _verified and recipient is not null then
  insert into public.vatra_verified_notices(recipient_uid,kind,title,body,target_kind,target_id)
  values(recipient,'community_verified','Спільноту офіційно підтверджено',
    'ВАТРА верифікувала спільноту «'||coalesce(group_info->>'name','Спільнота')||'».',
    'community',_group);
 end if;
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),case when _verified then 'verify_group' else 'unverify_group' end,_group,'{}'::jsonb);
 return jsonb_build_object('id',_group,'verified',_verified);
end $verify$;
revoke all on function public.vatra_verify_group(text,boolean) from public,anon;
grant execute on function public.vatra_verify_group(text,boolean) to authenticated;

create or replace function public.vatra_set_verification_by_handle(
 _handle text,_verified boolean default true)
returns table(user_id uuid, handle text, verified boolean)
language plpgsql security definer set search_path='' set row_security=off as $fn$
declare subject uuid; normalized text;
begin
 if not public.vatra_has_permission('verify') then raise exception 'Verification permission required.'; end if;
 normalized:=lower(btrim(regexp_replace(coalesce(_handle,''),'^@','')));
 select split_part(p.path,'/',2)::uuid into subject
 from public.app_data p where p.path ~ '^publicProfiles/[0-9a-fA-F-]{36}$'
 and lower(btrim(p.value->>'handle'))=normalized limit 1;
 if subject is null then raise exception 'Account @% not found.',normalized; end if;
 insert into public.app_data(path,value,updated_at)
 values('verifiedUsers/'||subject::text,
 jsonb_build_object('verified',_verified,'updatedAt',(extract(epoch from now())*1000)::bigint,
 'updatedBy',auth.uid()::text),now())
 on conflict(path) do update set value=excluded.value,updated_at=now();
 if _verified then
   insert into public.vatra_verified_notices(recipient_uid,kind,title,body,target_kind,target_id)
   values(subject,'account_verified','Акаунт офіційно підтверджено',
   'ВАТРА верифікувала Ваш акаунт. Синя галочка збережеться після зміни @псевдоніма.',
   'account',subject::text);
 end if;
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),case when _verified then 'verify_account' else 'unverify_account' end,
 subject::text,jsonb_build_object('handle',normalized));
 return query select subject,normalized,_verified;
end $fn$;

create or replace function public.vatra_review_verification(
 _id bigint,_approve boolean,_response text)
returns jsonb language plpgsql security definer
set search_path='' set row_security=off as $review$
declare item public.vatra_verification_requests; group_info jsonb; explanation text;
begin
 if not public.vatra_has_permission('review_verification') then raise exception 'Verification review permission required.'; end if;
 explanation:=left(btrim(coalesce(_response,'')),1500);
 if length(explanation)<4 then raise exception 'Give the applicant a reason (at least 4 characters).'; end if;
 select * into item from public.vatra_verification_requests where id=_id for update;
 if item.id is null then raise exception 'Application not found.'; end if;
 if item.status<>'pending' then raise exception 'Application already reviewed.'; end if;
 if _approve then
  if item.target_kind='account' then
   if not exists(select 1 from public.app_data where path='publicProfiles/'||item.target_id)
   then raise exception 'Account profile no longer exists.'; end if;
   insert into public.app_data(path,value,updated_at)
   values('verifiedUsers/'||item.target_id,
     jsonb_build_object('verified',true,'updatedAt',(extract(epoch from now())*1000)::bigint,'updatedBy',auth.uid()::text),now())
   on conflict(path) do update set value=excluded.value,updated_at=now();
  else
   select value into group_info from public.app_data where path='groups/'||item.target_id;
   if group_info is null then raise exception 'Community no longer exists.'; end if;
   insert into public.vatra_verified_groups(group_id,verified,updated_by)
   values(item.target_id,true,auth.uid())
   on conflict(group_id) do update set verified=true,updated_by=auth.uid(),updated_at=now();
  end if;
 end if;
 update public.vatra_verification_requests set status=case when _approve then 'approved' else 'rejected' end,
  response=explanation,reviewed_by=auth.uid(),reviewed_at=now() where id=item.id;
 insert into public.vatra_verified_notices(recipient_uid,kind,title,body,target_kind,target_id)
 values(item.applicant_uid,
 case when not _approve then 'verification_rejected'
      when item.target_kind='account' then 'account_verified' else 'community_verified' end,
 case when not _approve then 'Рішення щодо верифікації'
      when item.target_kind='account' then 'Ваш акаунт офіційно підтверджено'
      else 'Вашу спільноту офіційно підтверджено' end,
 case when _approve then 'ВАТРА схвалила Вашу заявку. ' else 'ВАТРА відхилила заявку. ' end||explanation,
 item.target_kind,item.target_id);
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),case when _approve then 'verification_approved' else 'verification_rejected' end,
 item.id::text,jsonb_build_object('kind',item.target_kind,'target',item.target_id,'response',explanation));
 return jsonb_build_object('id',item.id,'approved',_approve);
end $review$;
revoke all on function public.vatra_review_verification(bigint,boolean,text) from public,anon;
grant execute on function public.vatra_review_verification(bigint,boolean,text) to authenticated;

-- Permission corrections for existing moderation RPCs: owner/admin may ban,
-- moderator can hide content, support may review/report but cannot ban.
create or replace function public.vatra_admin_set_account_ban(
 _handle text,_ban boolean,_reason text,_hours integer default 0)
returns jsonb language plpgsql security definer
set search_path='' set row_security=off as $act$
declare normalized text; subject uuid; explanation text; expiration timestamptz;
begin
 if not public.vatra_has_permission('ban_account') then raise exception 'Немає прав адміністратора.'; end if;
 normalized:=lower(btrim(regexp_replace(coalesce(_handle,''),'^@','')));
 if normalized ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
   subject:=normalized::uuid;
   select value->>'handle' into normalized from public.app_data where path='publicProfiles/'||subject::text;
   if normalized is null then raise exception 'Акаунт з цим UID не знайдено.'; end if;
 else
   select split_part(path,'/',2)::uuid into subject from public.app_data
   where path ~ '^publicProfiles/[0-9a-fA-F-]{36}$'
     and lower(btrim(value->>'handle'))=normalized limit 1;
 end if;
 if subject is null then raise exception 'Акаунт @% не знайдено.',normalized; end if;
 if subject=auth.uid() then raise exception 'Не можна заблокувати власний адміністраторський акаунт.'; end if;
 if exists(select 1 from public.vatra_verification_admins where user_id=subject)
 then raise exception 'Адміністратора не можна заблокувати через цю панель.'; end if;
 explanation:=left(btrim(coalesce(_reason,'')),500);
 if _ban and length(explanation)<3 then raise exception 'Укажіть причину блокування.'; end if;
 if _hours<0 or _hours>87600 then raise exception 'Невірний строк блокування.'; end if;
 expiration:=case when not _ban or _hours=0 then null else now()+make_interval(hours=>_hours) end;
 insert into public.vatra_moderation_account_bans(user_id,active,reason,expires_at,updated_by)
 values(subject,_ban,coalesce(nullif(explanation,''),'Розблоковано'),expiration,auth.uid())
 on conflict(user_id) do update set active=excluded.active,reason=excluded.reason,
 expires_at=excluded.expires_at,updated_by=auth.uid(),updated_at=now();
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),case when _ban then 'account_ban' else 'account_unban' end,
 subject::text,jsonb_build_object('handle',normalized,'reason',explanation,'hours',_hours));
 return jsonb_build_object('uid',subject,'handle',normalized,'banned',_ban,'expiresAt',expiration);
end $act$;

create or replace function public.vatra_admin_set_group_ban(
 _group_id text,_ban boolean,_reason text,_hours integer default 0)
returns jsonb language plpgsql security definer
set search_path='' set row_security=off as $act$
declare explanation text; expiration timestamptz; title text;
begin
 if not public.vatra_has_permission('ban_group') then raise exception 'Немає прав адміністратора.'; end if;
 if coalesce(_group_id,'') !~ '^[a-zA-Z0-9_-]{1,128}$' then raise exception 'Невірний ID спільноти.'; end if;
 select value->>'name' into title from public.app_data where path='groups/'||_group_id;
 if title is null then raise exception 'Спільноту не знайдено.'; end if;
 explanation:=left(btrim(coalesce(_reason,'')),500);
 if _ban and length(explanation)<3 then raise exception 'Укажіть причину блокування.'; end if;
 if _hours<0 or _hours>87600 then raise exception 'Невірний строк блокування.'; end if;
 expiration:=case when not _ban or _hours=0 then null else now()+make_interval(hours=>_hours) end;
 insert into public.vatra_moderation_group_bans(group_id,active,reason,expires_at,updated_by)
 values(_group_id,_ban,coalesce(nullif(explanation,''),'Розблоковано'),expiration,auth.uid())
 on conflict(group_id) do update set active=excluded.active,reason=excluded.reason,
 expires_at=excluded.expires_at,updated_by=auth.uid(),updated_at=now();
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),case when _ban then 'group_ban' else 'group_unban' end,
 _group_id,jsonb_build_object('name',title,'reason',explanation,'hours',_hours));
 return jsonb_build_object('id',_group_id,'name',title,'banned',_ban,'expiresAt',expiration);
end $act$;

create or replace function public.vatra_admin_review_report(
 _case_id bigint,_status text,_response text)
returns jsonb language plpgsql security definer
set search_path='' set row_security=off as $act$
declare found_case public.vatra_moderation_cases;
begin
 if not public.vatra_has_permission('review_report') then raise exception 'Немає прав адміністратора.'; end if;
 if _status not in ('open','reviewing','resolved','dismissed') then raise exception 'Невідомий статус.'; end if;
 if char_length(coalesce(_response,''))>1500 then raise exception 'Відповідь задовга.'; end if;
 update public.vatra_moderation_cases set status=_status,
   admin_response=left(btrim(coalesce(_response,'')),1500),
   reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
 where id=_case_id returning * into found_case;
 if found_case.id is null then raise exception 'Скаргу не знайдено.'; end if;
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),'report_'||_status,found_case.id::text,
   jsonb_build_object('reportPath',found_case.report_path,'response',found_case.admin_response));
 return jsonb_build_object('id',found_case.id,'status',found_case.status);
end $act$;

create or replace function public.vatra_admin_set_content_hidden(
 _content_path text,_hide boolean,_reason text)
returns jsonb language plpgsql security definer
set search_path='' set row_security=off as $act$
declare reason_clean text;
begin
 if not public.vatra_has_permission('hide_content') then raise exception 'Немає прав адміністратора.'; end if;
 if _content_path !~ '^(posts/[^/]+|groupPosts/[^/]+/[^/]+|comments/[^/]+/[^/]+|videos/[^/]+)$'
 then raise exception 'Вкажіть шлях допису, коментаря або відео.'; end if;
 if not exists (select 1 from public.app_data where path=_content_path)
 then raise exception 'Матеріал не знайдено в базі ВАТРИ.'; end if;
 reason_clean:=left(btrim(coalesce(_reason,'')),500);
 if _hide and length(reason_clean)<3 then raise exception 'Вкажіть причину приховування.'; end if;
 insert into public.vatra_moderation_hidden_content(content_path,active,reason,updated_by)
 values (_content_path,_hide,reason_clean,auth.uid())
 on conflict(content_path) do update set active=excluded.active,reason=excluded.reason,
 updated_by=auth.uid(),updated_at=now();
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),case when _hide then 'content_hidden' else 'content_restored' end,
 _content_path,jsonb_build_object('reason',reason_clean));
 return jsonb_build_object('path',_content_path,'hidden',_hide);
end $act$;


-- The staff may only read data relevant to assigned duties.
-- Replaces moderation case SELECT policy to allow support and moderators.
drop policy if exists vatra_mod_case_read on public.vatra_moderation_cases;
create policy vatra_mod_case_read on public.vatra_moderation_cases
for select to authenticated
using(public.vatra_has_permission('view_reports') or reporter_uid=auth.uid());

commit;

-- REQUIRED bootstrap, run a separate statement as postgres in SQL Editor:
-- INSERT INTO public.vatra_network_owners(user_id)
-- VALUES ('YOUR_AUTH_USERS_UUID') ON CONFLICT DO NOTHING;
-- The old vatra_verification_admins list does not automatically become site owner.
