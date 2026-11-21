-- Applied in Supabase as 20261113175142.
-- Welcome-gift trigger lives in vatra_internal schema (not private/public).
-- After renaming public.vatra_profile_gifts to public.profile_gifts, its
-- original ON CONFLICT would fail through a read-only compatibility view.
CREATE OR REPLACE FUNCTION vatra_internal.award_welcome_gift()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.profile_gifts(recipient_vatra_id,gift_code,created_at)
 values (new.vatra_id,'first_flame',new.created_at)
 on conflict (recipient_vatra_id,gift_code) do nothing;
 return new;
end;
$function$;
