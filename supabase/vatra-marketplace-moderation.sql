begin;
create schema if not exists vatra_market_private;
revoke all on schema vatra_market_private from public, anon, authenticated;
grant usage on schema vatra_market_private to authenticated;
create table public.vatra_market_moderators(user_id uuid primary key references public.accounts(user_id) on delete cascade);
alter table public.vatra_market_moderators enable row level security;
revoke all on public.vatra_market_moderators from public, anon, authenticated;
grant select on public.vatra_market_moderators to authenticated;
create policy market_moderator_self on public.vatra_market_moderators for select to authenticated using(user_id=(select auth.uid()));
insert into public.vatra_market_moderators(user_id) select user_id from public.accounts where vatra_id=1;
create function vatra_market_private.is_moderator() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.vatra_market_moderators where user_id=(select auth.uid()))$$;
revoke all on function vatra_market_private.is_moderator() from public,anon;
grant execute on function vatra_market_private.is_moderator() to authenticated;

create table public.vatra_market_suspensions(seller_vatra_id bigint primary key references public.accounts(vatra_id) on delete cascade, reason text not null check(char_length(btrim(reason)) between 3 and 500), created_at timestamptz not null default now());
alter table public.vatra_market_suspensions enable row level security;
revoke all on public.vatra_market_suspensions from public,anon,authenticated;
grant select,insert,delete on public.vatra_market_suspensions to authenticated;
create policy market_suspension_read on public.vatra_market_suspensions for select to authenticated using((select vatra_market_private.is_moderator()) or exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=seller_vatra_id));
create policy market_suspension_insert on public.vatra_market_suspensions for insert to authenticated with check((select vatra_market_private.is_moderator()) and not exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=seller_vatra_id));
create policy market_suspension_delete on public.vatra_market_suspensions for delete to authenticated using((select vatra_market_private.is_moderator()));
create function vatra_market_private.is_suspended(p_seller bigint) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.vatra_market_suspensions s where s.seller_vatra_id=p_seller)$$;
revoke all on function vatra_market_private.is_suspended(bigint) from public,anon;
grant execute on function vatra_market_private.is_suspended(bigint) to authenticated;

alter table public.vatra_marketplace_listings
 add column moderation_status text not null default 'pending' check(moderation_status in ('pending','approved','rejected')),
 add column moderation_reason text not null default '' check(char_length(moderation_reason)<=1000),
 add column moderation_flags text[] not null default '{}',
 add column rules_accepted boolean not null default false,
 add column rules_accepted_at timestamptz;
grant select(moderation_status,moderation_reason,moderation_flags,rules_accepted_at), insert(rules_accepted), update(moderation_status,moderation_reason) on public.vatra_marketplace_listings to authenticated;
create index vatra_market_moderation_queue_idx on public.vatra_marketplace_listings(moderation_status,created_at);
create table public.vatra_market_moderation_history(
 id bigint generated always as identity primary key, listing_id uuid, seller_vatra_id bigint not null,
 actor_id uuid, event text not null, reason text not null default '', created_at timestamptz not null default now());
alter table public.vatra_market_moderation_history enable row level security;
revoke all on public.vatra_market_moderation_history from public,anon,authenticated;
grant select(id,listing_id,seller_vatra_id,event,reason,created_at) on public.vatra_market_moderation_history to authenticated;
create policy market_history_read on public.vatra_market_moderation_history for select to authenticated using((select vatra_market_private.is_moderator()) or exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=seller_vatra_id));

create function vatra_market_private.guard_listing() returns trigger language plpgsql security definer set search_path='' as $$
declare body_text text; flags text[]:='{}'; moderator boolean:=vatra_market_private.is_moderator();
begin
 if tg_op='INSERT' then
  if not new.rules_accepted then raise exception 'VATRA_MARKET_RULES_REQUIRED'; end if;
  if vatra_market_private.is_suspended(new.seller_vatra_id) then raise exception 'VATRA_MARKET_SUSPENDED'; end if;
  new.moderation_status:='pending'; new.moderation_reason:=''; new.rules_accepted_at:=now();
  body_text:=lower(concat_ws(' ',new.title,new.description,new.details::text));
  if body_text ~ '(збро[яїю]|боєприпас|набої|пістолет|автомат калаш|weapon|ammunition|firearm|gun for sale)' then flags:=array_append(flags,'weapons'); end if;
  if body_text ~ '(наркотик|кокаїн|героїн|марихуан|канабіс|cocaine|heroin|cannabis)' then flags:=array_append(flags,'drugs'); end if;
  if body_text ~ '(горілк|віскі|коньяк|алкогол|vodka|whisky|whiskey|alcohol)' then flags:=array_append(flags,'alcohol'); end if;
  if body_text ~ '(сигарет|тютюн|нікотин|вейп|cigarette|tobacco|nicotine|vape)' then flags:=array_append(flags,'tobacco'); end if;
  if body_text ~ '(продам цуцен|продам кошен|жив[аі] тварин|puppies for sale|kitten for sale)' then flags:=array_append(flags,'animals'); end if;
  if body_text ~ '(підробк|реплік[аиу]|counterfeit|fake brand)' then flags:=array_append(flags,'ip'); end if;
  if body_text ~ '(cvv|пін.код|код підтвердження|verification code|передоплата на картку)' then flags:=array_append(flags,'fraud'); end if;
  new.moderation_flags:=flags;
 elsif tg_op='UPDATE' then
  if not moderator and (new.moderation_status is distinct from old.moderation_status or new.moderation_reason is distinct from old.moderation_reason) then raise exception 'VATRA_MARKET_MODERATOR_REQUIRED'; end if;
  if new.status='active' and old.status is distinct from new.status and vatra_market_private.is_suspended(new.seller_vatra_id) then raise exception 'VATRA_MARKET_SUSPENDED'; end if;
  if new.moderation_status='rejected' and char_length(btrim(new.moderation_reason))<3 then raise exception 'VATRA_MARKET_REASON_REQUIRED';end if;
 end if;
 return new;
end $$;
revoke all on function vatra_market_private.guard_listing() from public,anon,authenticated;
create trigger market_guard_listing before insert or update on public.vatra_marketplace_listings for each row execute function vatra_market_private.guard_listing();

create function vatra_market_private.log_listing() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.vatra_market_moderation_history(listing_id,seller_vatra_id,actor_id,event,reason) values(new.id,new.seller_vatra_id,auth.uid(),'pending',array_to_string(new.moderation_flags,', '));
 elsif new.moderation_status is distinct from old.moderation_status or new.moderation_reason is distinct from old.moderation_reason then
  insert into public.vatra_market_moderation_history(listing_id,seller_vatra_id,actor_id,event,reason) values(new.id,new.seller_vatra_id,auth.uid(),new.moderation_status,new.moderation_reason);
 end if;
 return new;
end $$;
revoke all on function vatra_market_private.log_listing() from public,anon,authenticated;
create trigger market_log_listing after insert or update on public.vatra_marketplace_listings for each row execute function vatra_market_private.log_listing();
insert into public.vatra_market_moderation_history(listing_id,seller_vatra_id,event,reason) select id,seller_vatra_id,'pending','Existing listing requires initial review' from public.vatra_marketplace_listings;

alter policy vatra_market_read on public.vatra_marketplace_listings to authenticated using(
 seller_id=(select auth.uid()) or (select vatra_market_private.is_moderator()) or
 (status='active' and moderation_status='approved' and not vatra_market_private.is_suspended(seller_vatra_id) and not public.vatra_has_block_between(seller_vatra_id)));
alter policy vatra_market_create on public.vatra_marketplace_listings to authenticated with check(
 seller_id=(select auth.uid()) and rules_accepted and moderation_status='pending' and not vatra_market_private.is_suspended(seller_vatra_id)
 and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=seller_vatra_id));
create policy market_moderator_update on public.vatra_marketplace_listings for update to authenticated using((select vatra_market_private.is_moderator())) with check((select vatra_market_private.is_moderator()));
alter policy vatra_market_image_read on storage.objects to authenticated using(bucket_id='marketplace-images' and (
 exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(objects.name,'/',1)) or
 exists(select 1 from public.vatra_marketplace_listings l where (l.image_path=objects.name or objects.name=any(l.image_paths)) and ((select vatra_market_private.is_moderator()) or (l.status='active' and l.moderation_status='approved' and not vatra_market_private.is_suspended(l.seller_vatra_id))))));
create table public.vatra_market_cases(
 id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.vatra_marketplace_listings(id) on delete cascade,
 submitter uuid not null default auth.uid(), kind text not null check(kind in ('report','appeal')),
 reason text not null check(char_length(btrim(reason)) between 10 and 1000),
 state text not null default 'open' check(state in ('open','resolved','dismissed')),
 resolution text not null default '' check(char_length(resolution)<=1000), created_at timestamptz not null default now(),
 unique(listing_id,submitter,kind));
alter table public.vatra_market_cases enable row level security;
revoke all on public.vatra_market_cases from public,anon,authenticated;
grant select on public.vatra_market_cases to authenticated;
grant insert(listing_id,kind,reason),update(state,resolution) on public.vatra_market_cases to authenticated;
create policy market_case_read on public.vatra_market_cases for select to authenticated using(submitter=(select auth.uid()) or (select vatra_market_private.is_moderator()));
create policy market_case_create on public.vatra_market_cases for insert to authenticated with check(submitter=(select auth.uid()) and state='open' and exists(
 select 1 from public.vatra_marketplace_listings l where l.id=listing_id and ((kind='report' and not exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=l.seller_vatra_id) and l.status='active' and l.moderation_status='approved') or (kind='appeal' and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=l.seller_vatra_id) and l.moderation_status='rejected'))));
create policy market_case_resolve on public.vatra_market_cases for update to authenticated using((select vatra_market_private.is_moderator())) with check((select vatra_market_private.is_moderator()) and (state='open' or char_length(btrim(resolution))>=3));


create function vatra_market_private.log_suspension() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.vatra_market_moderation_history(seller_vatra_id,actor_id,event,reason) values(new.seller_vatra_id,auth.uid(),'suspended',new.reason);
  return new;
 end if;
 insert into public.vatra_market_moderation_history(seller_vatra_id,actor_id,event,reason) values(old.seller_vatra_id,auth.uid(),'unsuspended',old.reason);
 return old;
end $$;
revoke all on function vatra_market_private.log_suspension() from public,anon,authenticated;
create trigger market_log_suspension after insert or delete on public.vatra_market_suspensions for each row execute function vatra_market_private.log_suspension();

alter policy vatra_market_image_insert on storage.objects to authenticated with check(
 bucket_id='marketplace-images' and name ~ '^[1-9][0-9]*/[a-f0-9-]{36}[.](jpg|png|webp)$'
 and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(objects.name,'/',1) and not vatra_market_private.is_suspended(a.vatra_id)));
create function vatra_market_private.log_case_resolution() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.state is distinct from old.state or new.resolution is distinct from old.resolution then
  insert into public.vatra_market_moderation_history(listing_id,seller_vatra_id,actor_id,event,reason)
  select l.id,l.seller_vatra_id,auth.uid(),new.kind||'_'||new.state,'' from public.vatra_marketplace_listings l where l.id=new.listing_id;
 end if;
 return new;
end $$;
revoke all on function vatra_market_private.log_case_resolution() from public,anon,authenticated;
create trigger market_log_case_resolution after update on public.vatra_market_cases for each row execute function vatra_market_private.log_case_resolution();
commit;
