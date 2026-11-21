begin;
create function vatra_market_private.verify_listing_images() returns trigger language plpgsql security definer set search_path='' as $$
declare path text;
begin
 for path in select distinct p from unnest(array_append(new.image_paths,new.image_path)) as paths(p) where p is not null loop
  if not exists(select 1 from storage.objects o where o.bucket_id='marketplace-images' and o.name=path) then
   raise exception 'VATRA_MARKET_IMAGE_NOT_UPLOADED';
  end if;
 end loop;
 return new;
end $$;
revoke all on function vatra_market_private.verify_listing_images() from public,anon,authenticated;
create trigger market_verify_listing_images before insert on public.vatra_marketplace_listings for each row execute function vatra_market_private.verify_listing_images();

alter policy vatra_market_image_insert on storage.objects to authenticated with check(
 bucket_id='marketplace-images' and name ~ '^[1-9][0-9]*/[a-f0-9-]{36}[.](jpg|png|webp)$'
 and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(objects.name,'/',1) and not vatra_market_private.is_suspended(a.vatra_id))
 and not exists(select 1 from public.vatra_marketplace_listings l where l.image_path=objects.name or objects.name=any(l.image_paths)));
alter policy vatra_market_image_delete on storage.objects to authenticated using(
 bucket_id='marketplace-images' and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(objects.name,'/',1))
 and not exists(select 1 from public.vatra_marketplace_listings l where l.image_path=objects.name or objects.name=any(l.image_paths)));

alter table public.vatra_market_cases add column seller_vatra_id bigint;
update public.vatra_market_cases c set seller_vatra_id=l.seller_vatra_id from public.vatra_marketplace_listings l where l.id=c.listing_id;
alter table public.vatra_market_cases alter column seller_vatra_id set not null;
alter table public.vatra_market_cases drop constraint vatra_market_cases_listing_id_fkey;

create function vatra_market_private.set_case_seller() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select seller_vatra_id into new.seller_vatra_id from public.vatra_marketplace_listings where id=new.listing_id;
 if new.seller_vatra_id is null then raise exception 'VATRA_MARKET_LISTING_UNAVAILABLE';end if;
 return new;
end $$;
revoke all on function vatra_market_private.set_case_seller() from public,anon,authenticated;
create trigger market_set_case_seller before insert on public.vatra_market_cases for each row execute function vatra_market_private.set_case_seller();

create or replace function vatra_market_private.log_case_resolution() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.vatra_market_moderation_history(listing_id,seller_vatra_id,actor_id,event,reason)
  values(new.listing_id,new.seller_vatra_id,auth.uid(),new.kind||'_submitted','');
 elsif new.state is distinct from old.state or new.resolution is distinct from old.resolution then
  insert into public.vatra_market_moderation_history(listing_id,seller_vatra_id,actor_id,event,reason)
  values(new.listing_id,new.seller_vatra_id,auth.uid(),new.kind||'_'||new.state,'');
 end if;
 return new;
end $$;
drop trigger market_log_case_resolution on public.vatra_market_cases;
create trigger market_log_case_resolution after insert or update on public.vatra_market_cases for each row execute function vatra_market_private.log_case_resolution();
alter policy market_history_read on public.vatra_market_moderation_history to authenticated using((select vatra_market_private.is_moderator()) or (event in ('pending','approved','rejected','suspended','unsuspended') and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=seller_vatra_id)));

commit;
