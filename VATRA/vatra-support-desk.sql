-- ВАТРА: захищені звернення до техпідтримки та контроль роботи персоналу
-- Execute AFTER vatra-staff-verification.sql, using Supabase SQL Editor (postgres).
begin;
create table if not exists public.vatra_support_tickets(
 id bigint generated always as identity primary key,
 requester_uid uuid not null references auth.users(id) on delete cascade,
 assigned_uid uuid references auth.users(id) on delete set null,
 subject text not null check(char_length(subject) between 5 and 160),
 status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
 created_at timestamptz not null default now(),
 last_activity_at timestamptz not null default now(),
 resolved_at timestamptz
);
create index if not exists vatra_support_queue_idx on public.vatra_support_tickets(assigned_uid,status,last_activity_at desc);
create index if not exists vatra_support_owner_idx on public.vatra_support_tickets(requester_uid,created_at desc);
create table if not exists public.vatra_support_messages(
 id bigint generated always as identity primary key,
 ticket_id bigint not null references public.vatra_support_tickets(id) on delete cascade,
 sender_uid uuid not null references auth.users(id) on delete restrict,
 body text not null check(char_length(body) between 1 and 4000),
 created_at timestamptz not null default now()
);
create index if not exists vatra_support_messages_idx on public.vatra_support_messages(ticket_id,id);
alter table public.vatra_support_tickets enable row level security;
alter table public.vatra_support_messages enable row level security;
revoke all on public.vatra_support_tickets from public,anon,authenticated;
revoke all on public.vatra_support_messages from public,anon,authenticated;
grant select on public.vatra_support_tickets,public.vatra_support_messages to authenticated;

-- A user can read their own case. Only its assigned support agent or the owner
-- may see the service conversation. A moderator/admin has NO automatic access.
create or replace function public.vatra_support_can_access(_ticket bigint)
returns boolean language sql stable security definer set search_path='' set row_security=off as $access$
 select auth.uid() is not null and exists(
  select 1 from public.vatra_support_tickets t
  where t.id=_ticket
  and (
    t.requester_uid=auth.uid()
    or public.vatra_staff_role()='owner'
    or (public.vatra_staff_role()='support' and t.assigned_uid=auth.uid())
  )
 );
$access$;
revoke all on function public.vatra_support_can_access(bigint) from public,anon;
grant execute on function public.vatra_support_can_access(bigint) to authenticated;

drop policy if exists vatra_support_tickets_read on public.vatra_support_tickets;
create policy vatra_support_tickets_read on public.vatra_support_tickets
 for select to authenticated using(
  requester_uid=auth.uid()
  or public.vatra_staff_role()='owner'
  or (public.vatra_staff_role()='support' and (assigned_uid=auth.uid() or assigned_uid is null))
 );
drop policy if exists vatra_support_messages_read on public.vatra_support_messages;
create policy vatra_support_messages_read on public.vatra_support_messages
 for select to authenticated using(public.vatra_support_can_access(ticket_id));
-- No direct client INSERT/UPDATE/DELETE grants. All changes use guarded RPCs.

-- Assign new cases to the least-loaded support agent. The lock protects against
-- competing creations selecting the same agent at the same instant.
create or replace function public.vatra_support_open(_subject text,_message text)
returns bigint language plpgsql security definer set search_path='' set row_security=off as $open$
declare assigned uuid; id_new bigint; title text; body_text text;
begin
 if auth.uid() is null then raise exception 'Увійдіть до ВАТРИ, щоб звернутися до підтримки.'; end if;
 title:=btrim(coalesce(_subject,''));body_text:=btrim(coalesce(_message,''));
 if length(title)<5 or length(title)>160 then raise exception 'Тема має містити від 5 до 160 символів.'; end if;
 if length(body_text)<1 or length(body_text)>4000 then raise exception 'Повідомлення має містити від 1 до 4000 символів.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(731442);
 select staff.user_id into assigned
 from public.vatra_staff_members staff
 left join lateral (
   select count(*) as active_count from public.vatra_support_tickets t
   where t.assigned_uid=staff.user_id and t.status in ('open','in_progress')
 ) loads on true
 where staff.role='support'
 order by loads.active_count asc,staff.appointed_at asc,staff.user_id asc
 limit 1;
 insert into public.vatra_support_tickets(requester_uid,assigned_uid,subject)
 values(auth.uid(),assigned,title) returning id into id_new;
 insert into public.vatra_support_messages(ticket_id,sender_uid,body)
 values(id_new,auth.uid(),body_text);
 return id_new;
end $open$;
revoke all on function public.vatra_support_open(text,text) from public,anon;
grant execute on function public.vatra_support_open(text,text) to authenticated;

create or replace function public.vatra_support_reply(_ticket bigint,_body text)
returns bigint language plpgsql security definer set search_path='' set row_security=off as $reply$
declare t public.vatra_support_tickets; msg_id bigint; body_text text; staff_role text;
begin
 if auth.uid() is null then raise exception 'Потрібна авторизація.'; end if;
 body_text:=btrim(coalesce(_body,''));
 if length(body_text)<1 or length(body_text)>4000 then raise exception 'Повідомлення має містити від 1 до 4000 символів.'; end if;
 select * into t from public.vatra_support_tickets where id=_ticket for update;
 if t.id is null then raise exception 'Звернення не знайдено.'; end if;
 staff_role:=public.vatra_staff_role();
 if t.requester_uid<>auth.uid() and staff_role<>'owner'
    and not (staff_role='support' and t.assigned_uid=auth.uid())
 then raise exception 'Немає доступу до цього звернення.'; end if;
 if t.status='closed' then raise exception 'Звернення закрите. Створіть нове звернення.'; end if;
 insert into public.vatra_support_messages(ticket_id,sender_uid,body)
 values(t.id,auth.uid(),body_text) returning id into msg_id;
 update public.vatra_support_tickets set
  last_activity_at=now(),
  status=case when staff_role in ('owner','support') then 'in_progress'
              when status='resolved' then 'open' else status end,
  resolved_at=null
 where id=t.id;
 if staff_role in ('owner','support') then
  insert into public.vatra_moderation_audit(actor_uid,action,target,details)
  values(auth.uid(),'support_reply',t.id::text,jsonb_build_object('message_id',msg_id,'body',body_text));
 end if;
 return msg_id;
end $reply$;
revoke all on function public.vatra_support_reply(bigint,text) from public,anon;
grant execute on function public.vatra_support_reply(bigint,text) to authenticated;

create or replace function public.vatra_support_assign(_ticket bigint,_employee uuid)
returns boolean language plpgsql security definer set search_path='' set row_security=off as $assign$
declare current_ticket public.vatra_support_tickets;
begin
 if public.vatra_staff_role()<>'owner' then raise exception 'Призначення доступне лише власнику ВАТРИ.'; end if;
 if _employee is not null and not exists(select 1 from public.vatra_staff_members where user_id=_employee and role='support')
 then raise exception 'UID не має посади техпідтримки.'; end if;
 select * into current_ticket from public.vatra_support_tickets where id=_ticket for update;
 if current_ticket.id is null then raise exception 'Звернення не знайдено.'; end if;
 update public.vatra_support_tickets set assigned_uid=_employee,last_activity_at=now() where id=_ticket;
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),'support_assign',_ticket::text,jsonb_build_object('employee_uid',_employee,'previous_uid',current_ticket.assigned_uid));
 return true;
end $assign$;
revoke all on function public.vatra_support_assign(bigint,uuid) from public,anon;
grant execute on function public.vatra_support_assign(bigint,uuid) to authenticated;

create or replace function public.vatra_support_claim(_ticket bigint)
returns boolean language plpgsql security definer set search_path='' set row_security=off as $claim$
declare t public.vatra_support_tickets;
begin
 if public.vatra_staff_role()<>'support' then raise exception 'Лише техпідтримка може прийняти звернення.'; end if;
 select * into t from public.vatra_support_tickets where id=_ticket for update;
 if t.id is null or t.assigned_uid is not null or t.status not in ('open','in_progress')
 then raise exception 'Звернення вже призначене або закрите.'; end if;
 update public.vatra_support_tickets set assigned_uid=auth.uid(),status='in_progress',last_activity_at=now() where id=_ticket;
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),'support_claim',_ticket::text,'{}'::jsonb);
 return true;
end $claim$;
revoke all on function public.vatra_support_claim(bigint) from public,anon;
grant execute on function public.vatra_support_claim(bigint) to authenticated;

create or replace function public.vatra_support_status(_ticket bigint,_status text)
returns boolean language plpgsql security definer set search_path='' set row_security=off as $state$
declare t public.vatra_support_tickets; staff_role text;
begin
 if _status not in ('open','in_progress','resolved','closed') then raise exception 'Невідомий статус.'; end if;
 select * into t from public.vatra_support_tickets where id=_ticket for update;
 if t.id is null then raise exception 'Звернення не знайдено.'; end if;
 staff_role:=public.vatra_staff_role();
 if staff_role<>'owner' and not (staff_role='support' and t.assigned_uid=auth.uid())
    and not (t.requester_uid=auth.uid() and _status='closed')
 then raise exception 'Недостатньо прав.'; end if;
 update public.vatra_support_tickets set status=_status,last_activity_at=now(),
 resolved_at=case when _status in ('resolved','closed') then now() else null end where id=_ticket;
 if staff_role in ('owner','support') then
  insert into public.vatra_moderation_audit(actor_uid,action,target,details)
  values(auth.uid(),'support_status',_ticket::text,jsonb_build_object('from',t.status,'to',_status));
 end if;
 return true;
end $state$;
revoke all on function public.vatra_support_status(bigint,text) from public,anon;
grant execute on function public.vatra_support_status(bigint,text) to authenticated;

-- Staff opening a ticket is also visible in owner's audit (not a keystroke log).
create or replace function public.vatra_support_staff_view(_ticket bigint)
returns boolean language plpgsql security definer set search_path='' set row_security=off as $view$
begin
 if public.vatra_staff_role() not in ('owner','support') then return false; end if;
 if not public.vatra_support_can_access(_ticket) then raise exception 'Немає доступу до звернення.'; end if;
 insert into public.vatra_moderation_audit(actor_uid,action,target,details)
 values(auth.uid(),'support_view',_ticket::text,'{}'::jsonb);
 return true;
end $view$;
revoke all on function public.vatra_support_staff_view(bigint) from public,anon;
grant execute on function public.vatra_support_staff_view(bigint) to authenticated;
commit;
