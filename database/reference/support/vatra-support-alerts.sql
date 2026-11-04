-- VATRA: new support conversations/replies are delivered to individual inboxes
-- Apply AFTER vatra-support-desk.sql and vatra-staff-verification.sql.
begin;
create table if not exists public.vatra_support_alerts(
 id bigint generated always as identity primary key,
 ticket_id bigint not null references public.vatra_support_tickets(id) on delete cascade,
 message_id bigint not null references public.vatra_support_messages(id) on delete cascade,
 recipient_uid uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(message_id,recipient_uid)
);
create index if not exists vatra_support_alerts_unread_idx
 on public.vatra_support_alerts(recipient_uid,read_at,created_at desc);
alter table public.vatra_support_alerts enable row level security;
revoke all on public.vatra_support_alerts from PUBLIC,anon,authenticated;
grant select on public.vatra_support_alerts to authenticated;
drop policy if exists vatra_support_alerts_own_read on public.vatra_support_alerts;
create policy vatra_support_alerts_own_read on public.vatra_support_alerts for select to authenticated
using(recipient_uid=auth.uid());
-- Every support message generates notifications for legitimate recipients.
-- The owner is notified for oversight. Staff only receives messages in assigned
-- tickets (or unassigned tickets that still need an operator).
create or replace function public.vatra_support_alert_on_message()
returns trigger language plpgsql security definer
set search_path='' set row_security=off as $trigger$
declare t public.vatra_support_tickets; receiver uuid;
begin
 select * into t from public.vatra_support_tickets where id=new.ticket_id;
 if t.id is null then return new; end if;
 for receiver in
  select distinct candidate.uid from (
   select t.requester_uid as uid
   union all select t.assigned_uid
   union all select user_id from public.vatra_network_owners
   union all select user_id from public.vatra_staff_members
    where role='support' and t.assigned_uid is null
  ) candidate
  where candidate.uid is not null and candidate.uid<>new.sender_uid
 loop
  insert into public.vatra_support_alerts(ticket_id,message_id,recipient_uid)
  values(new.ticket_id,new.id,receiver)
  on conflict(message_id,recipient_uid) do nothing;
 end loop;
 return new;
end $trigger$;
revoke all on function public.vatra_support_alert_on_message() from public,anon,authenticated;
drop trigger if exists vatra_support_alert_new_message on public.vatra_support_messages;
create trigger vatra_support_alert_new_message after insert on public.vatra_support_messages
for each row execute function public.vatra_support_alert_on_message();

-- Notify the newly assigned agent even if the initial message predates assignment.
create or replace function public.vatra_support_alert_on_assignment()
returns trigger language plpgsql security definer set search_path='' set row_security=off as $assign$
declare recent_id bigint;
begin
 if new.assigned_uid is distinct from old.assigned_uid and new.assigned_uid is not null then
  select id into recent_id from public.vatra_support_messages
  where ticket_id=new.id order by id desc limit 1;
  if recent_id is not null then
   insert into public.vatra_support_alerts(ticket_id,message_id,recipient_uid)
   values(new.id,recent_id,new.assigned_uid)
   on conflict(message_id,recipient_uid) do nothing;
  end if;
 end if;
 return new;
end $assign$;
revoke all on function public.vatra_support_alert_on_assignment() from public,anon,authenticated;
drop trigger if exists vatra_support_alert_assignment on public.vatra_support_tickets;
create trigger vatra_support_alert_assignment after update of assigned_uid on public.vatra_support_tickets
for each row execute function public.vatra_support_alert_on_assignment();

-- Backfill open cases so a newly deployed bell immediately shows waiting work.
insert into public.vatra_support_alerts(ticket_id,message_id,recipient_uid)
select t.id,m.id,recipient.uid
from public.vatra_support_tickets t
join lateral(select id,sender_uid from public.vatra_support_messages
 where ticket_id=t.id order by id desc limit 1) m on true
cross join lateral(
 select t.requester_uid as uid
 union select t.assigned_uid
 union select user_id from public.vatra_network_owners
 union select user_id from public.vatra_staff_members where role='support' and t.assigned_uid is null
) recipient
where t.status in ('open','in_progress') and recipient.uid is not null and recipient.uid<>m.sender_uid
on conflict(message_id,recipient_uid) do nothing;

-- A logged-in person marks ONLY their own alerts, never those of another employee.
create or replace function public.vatra_support_mark_read(_ticket bigint default null)
returns integer language plpgsql security definer
set search_path='' set row_security=off as $mark$
declare count_changed integer;
begin
 if auth.uid() is null then raise exception 'Необхідна авторизація.'; end if;
 if _ticket is not null and not public.vatra_support_can_access(_ticket)
 then raise exception 'Немає доступу до звернення.'; end if;
 update public.vatra_support_alerts
 set read_at=now()
 where recipient_uid=auth.uid() and read_at is null
   and (_ticket is null or ticket_id=_ticket);
 get diagnostics count_changed=row_count;
 return count_changed;
end $mark$;
revoke all on function public.vatra_support_mark_read(bigint) from PUBLIC,anon;
grant execute on function public.vatra_support_mark_read(bigint) to authenticated;
commit;