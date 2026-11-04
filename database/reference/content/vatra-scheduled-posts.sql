-- VATRA scheduled publishing. Supabase PostgreSQL only; no Firebase.
-- Run in SQL Editor. Publishing requires a separate pg_cron setup below.
create table if not exists public.vatra_scheduled_posts (
 id uuid primary key default gen_random_uuid(),
 author_uid uuid not null references auth.users(id) on delete cascade,
 group_id text,
 payload jsonb not null,
 scheduled_at timestamptz not null,
 created_at timestamptz not null default now(),
 published_at timestamptz,
 cancelled_at timestamptz,
 published_path text,
 last_error text,
 constraint vatra_schedule_payload_object check (jsonb_typeof(payload)='object'),
 constraint vatra_schedule_text_size check (length(coalesce(payload->>'text','')) <= 20000),
 constraint vatra_schedule_group_id_check check (group_id is null or group_id ~ '^[A-Za-z0-9_-]{4,128}$')
);
create index if not exists vatra_scheduled_posts_due_idx
 on public.vatra_scheduled_posts(scheduled_at)
 where published_at is null and cancelled_at is null;
alter table public.vatra_scheduled_posts enable row level security;
revoke all on public.vatra_scheduled_posts from anon, authenticated;
grant select, insert, update (cancelled_at) on public.vatra_scheduled_posts to authenticated;

create or replace function public.vatra_schedule_allowed(_uid uuid,_group_id text,_payload jsonb)
returns boolean language plpgsql stable security definer
set search_path='' set row_security=off
as $f$
declare can_group boolean;
begin
 if _uid is null or auth.uid() is distinct from _uid
    or jsonb_typeof(_payload) <> 'object'
    or coalesce(_payload->>'authorUid','') <> _uid::text then return false; end if;
 if coalesce(_payload->>'visibility','public') not in ('public','friends','private')
    or length(coalesce(_payload->>'text','')) > 20000
    or length(_payload::text)>120000
    or jsonb_typeof(_payload->'imageUrls') not in ('array','null')
    or jsonb_typeof(_payload->'pollOptions') not in ('object','null') then return false; end if;
 if _group_id is null then return coalesce(_payload->>'authorType','user')='user'; end if;
 if not (
  public.vatra_data_is_group_owner(_group_id,_uid)
  or exists (select 1 from public.app_data a where a.path='groupAdmins/'||_group_id||'/'||_uid::text and a.value='true'::jsonb)
  or (
   exists (select 1 from public.app_data a where a.path='groupModerators/'||_group_id||'/'||_uid::text and a.value='true'::jsonb)
   and not exists (select 1 from public.app_data g where g.path='groups/'||_group_id and g.value->>'moderatorsCanPost'='false')
  )
 ) then return false; end if;
 if coalesce(_payload->>'groupId','')<>_group_id
    or coalesce(_payload->>'visibility','public')<>'public'
    or not public.vatra_data_is_group_member(_group_id,_uid) then return false; end if;
 if coalesce(_payload->>'authorType','user')='group' then
  return public.vatra_data_is_group_owner(_group_id,_uid)
     or exists (
       select 1 from public.app_data a
       where a.path='groupAdmins/'||_group_id||'/'||_uid::text
         and a.value='true'::jsonb
     );
 end if;
 return coalesce(_payload->>'authorType','user')='user';
end;
$f$;
revoke all on function public.vatra_schedule_allowed(uuid,text,jsonb) from public,anon;
grant execute on function public.vatra_schedule_allowed(uuid,text,jsonb) to authenticated;

drop policy if exists vatra_scheduled_posts_select_self on public.vatra_scheduled_posts;
create policy vatra_scheduled_posts_select_self on public.vatra_scheduled_posts
 for select to authenticated using (author_uid=(select auth.uid()));

drop policy if exists vatra_scheduled_posts_insert_self on public.vatra_scheduled_posts;
create policy vatra_scheduled_posts_insert_self on public.vatra_scheduled_posts
 for insert to authenticated
 with check (
  author_uid=(select auth.uid())
  and scheduled_at>now()+interval '1 minute'
  and scheduled_at<=now()+interval '365 days'
  and published_at is null and cancelled_at is null and published_path is null
  and public.vatra_schedule_allowed(author_uid,group_id,payload)
 );

drop policy if exists vatra_scheduled_posts_cancel_self on public.vatra_scheduled_posts;
create policy vatra_scheduled_posts_cancel_self on public.vatra_scheduled_posts
 for update to authenticated
 using (author_uid=(select auth.uid()) and published_at is null and cancelled_at is null)
 with check (author_uid=(select auth.uid()) and cancelled_at is not null and published_at is null);
-- Only "cancelled_at" is editable by authenticated; the schedule and content
-- cannot be silently changed after creation.

create or replace function public.vatra_publish_due_posts(max_posts integer default 100)
returns integer language plpgsql security definer
set search_path='' set row_security=off
as $f$
declare job public.vatra_scheduled_posts%rowtype;
        published integer:=0;
        destination text; now_ms bigint; record_value jsonb;
        can_publish boolean;
begin
 for job in select * from public.vatra_scheduled_posts
     where scheduled_at<=now() and published_at is null and cancelled_at is null
     order by scheduled_at
     for update skip locked
     limit least(greatest(max_posts,1),100)
 loop
  begin
   can_publish := exists (select 1 from auth.users u where u.id=job.author_uid);
   if job.group_id is not null then
     can_publish := can_publish and public.vatra_data_is_group_member(job.group_id,job.author_uid);
     if coalesce(job.payload->>'authorType','user')='group' then
      can_publish := can_publish and (
       public.vatra_data_is_group_owner(job.group_id,job.author_uid)
       or exists (select 1 from public.app_data a
                  where a.path='groupAdmins/'||job.group_id||'/'||job.author_uid::text
                    and a.value='true'::jsonb)
      );
     end if;
   end if;
   if can_publish and job.group_id is not null then
     can_publish := public.vatra_data_is_group_owner(job.group_id,job.author_uid)
       or exists (select 1 from public.app_data a where a.path='groupAdmins/'||job.group_id||'/'||job.author_uid::text and a.value='true'::jsonb)
       or (
         exists (select 1 from public.app_data a where a.path='groupModerators/'||job.group_id||'/'||job.author_uid::text and a.value='true'::jsonb)
         and not exists (select 1 from public.app_data g where g.path='groups/'||job.group_id and g.value->>'moderatorsCanPost'='false')
       );
   end if;
   if not can_publish then
    update public.vatra_scheduled_posts set cancelled_at=now(),
      last_error='Права на публікацію втрачено.'
    where id=job.id;
    continue;
   end if;
   destination:=case when job.group_id is null then 'posts/' else 'groupPosts/'||job.group_id||'/' end||replace(job.id::text,'-','');
   now_ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
   record_value:=(job.payload
     - 'createdAt' - 'updatedAt')
     || jsonb_build_object('createdAt',now_ms,'updatedAt',now_ms,
                           'authorUid',job.author_uid::text);
   if job.group_id is null then
     record_value:=record_value - 'groupId' - 'authorType';
   else
     record_value:=record_value||jsonb_build_object('groupId',job.group_id);
   end if;
   insert into public.app_data(path,value,updated_at)
   values(destination,record_value,clock_timestamp())
   on conflict(path) do nothing;
   update public.vatra_scheduled_posts set published_at=clock_timestamp(),
     published_path=destination,last_error=null
   where id=job.id;
   published:=published+1;
  exception when others then
   update public.vatra_scheduled_posts set last_error=left(SQLERRM,250) where id=job.id;
  end;
 end loop;
 return published;
end;
$f$;
revoke all on function public.vatra_publish_due_posts(integer) from public, anon, authenticated;
grant execute on function public.vatra_publish_due_posts(integer) to service_role;

-- Enable pg_cron (Supabase Database > Extensions) then run this ONCE:
-- select cron.schedule('vatra-publish-scheduled-posts','* * * * *',
--   $$select public.vatra_publish_due_posts(100);$$);
-- Runs every minute. Function is service/server-only; browser cannot invoke it.
