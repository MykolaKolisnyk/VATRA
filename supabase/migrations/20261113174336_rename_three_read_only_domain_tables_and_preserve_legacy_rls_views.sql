-- Applied to production Supabase as 20261113174336.
-- Move read-only API aliases to real tables while retaining all data,
-- dependent RLS, triggers and old-client select-only compatibility.
-- This builds on 20261113171916 (the temporary domain-named views).
BEGIN;
DROP VIEW public.member_directory, public.account_states, public.profile_gifts;
ALTER TABLE public.vatra_directory RENAME TO member_directory;
ALTER TABLE public.vatra_account_states RENAME TO account_states;
ALTER TABLE public.vatra_profile_gifts RENAME TO profile_gifts;

-- Trigger function bodies refer to relation names as text. Update in the
-- same transaction as the physical rename; preserve SECURITY DEFINER owner.
CREATE OR REPLACE FUNCTION private.assign_vatra_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare new_number bigint;
begin
  update private.vatra_id_counter set last_assigned=last_assigned+1
  where singleton=true returning last_assigned into new_number;
  if new_number is null then raise exception 'VATRA ID counter missing'; end if;
  insert into public.accounts(user_id,vatra_id) values(new.id,new_number);
  insert into public.member_directory(vatra_id) values(new_number);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.vatra_record_deleted_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.account_states(vatra_id,state,blocked_until,changed_at)
 values(old.vatra_id,'deleted',null,now())
 on conflict(vatra_id) do update set state='deleted',blocked_until=null,changed_at=now();
 return old;
end $function$;

CREATE OR REPLACE FUNCTION private.vatra_sync_account_state()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id bigint;
begin
 select a.vatra_id into v_id from public.accounts a where a.user_id = new.id;
 if v_id is null then return new; end if;
 if new.deleted_at is not null then
   insert into public.account_states(vatra_id,state,blocked_until,changed_at)
   values(v_id,'deleted',null,now())
   on conflict(vatra_id) do update set state='deleted',blocked_until=null,changed_at=now();
 elsif new.banned_until is not null and new.banned_until > now() then
   insert into public.account_states(vatra_id,state,blocked_until,changed_at)
   values(v_id,'blocked',new.banned_until,now())
   on conflict(vatra_id) do update set state='blocked',blocked_until=excluded.blocked_until,changed_at=now();
 else
   delete from public.account_states where vatra_id=v_id and state='blocked';
 end if;
 return new;
end $function$;

CREATE VIEW public.vatra_directory WITH (security_invoker = true) AS
 SELECT vatra_id FROM public.member_directory;
CREATE VIEW public.vatra_account_states WITH (security_invoker = true) AS
 SELECT vatra_id,state,blocked_until,changed_at FROM public.account_states;
CREATE VIEW public.vatra_profile_gifts WITH (security_invoker = true) AS
 SELECT id,recipient_vatra_id,gift_code,created_at FROM public.profile_gifts;
REVOKE ALL ON TABLE public.vatra_directory,public.vatra_account_states,public.vatra_profile_gifts
 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.vatra_directory TO anon,authenticated;
GRANT SELECT ON TABLE public.vatra_account_states,public.vatra_profile_gifts TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
