begin;
alter table public.communities add column business_enabled boolean not null default false;
alter table public.business_companies add column club_id bigint unique references public.communities(club_id) on delete restrict;
grant select(business_enabled),insert(business_enabled),update(business_enabled) on public.communities to authenticated;
grant select(business_enabled) on public.communities to anon;
grant select(club_id) on public.business_companies to authenticated;
-- Retain each existing business and its IDs, team, bookings, listings and messages.
-- Create its community rather than guessing a match to an existing community.
do $migration$
declare c record; new_club bigint;
begin
 for c in select b.id,b.name,b.description,a.user_id from public.business_companies b join public.accounts a on a.vatra_id=b.owner_vatra_id where b.club_id is null loop
  if char_length(btrim(c.name)) not between 3 and 80 or char_length(c.description)>1200 then raise exception 'Existing company exceeds community text constraints'; end if;
  insert into public.communities(owner_id,name,description,category,business_enabled) values(c.user_id,c.name,c.description,'business',true) returning club_id into new_club;
  update public.business_companies set club_id=new_club where id=c.id;
 end loop;
 if exists(select 1 from public.business_companies where club_id is null) then raise exception 'Unlinked legacy business'; end if;
end $migration$;
create policy community_owner_enable_business on public.communities for update to authenticated
 using(owner_id=(select auth.uid()) and not business_enabled)
 with check(owner_id=(select auth.uid()) and business_enabled);
create function business_private.enable_community_business() returns trigger language plpgsql security definer set search_path='' as $$
declare member_id bigint;
begin
 if tg_op='UPDATE' then
  if old.business_enabled and not new.business_enabled then raise exception 'Business tools cannot currently be disabled';end if;
  if old.business_enabled=new.business_enabled then return new;end if;
 end if;
 if not new.business_enabled then return new;end if;
 member_id:=business_private.current_member();
 if member_id is null or new.owner_id is distinct from auth.uid() then raise exception 'Only a confirmed community owner can enable business tools';end if;
 insert into public.business_companies(club_id,owner_vatra_id,name,description,category,category_code)
 values(new.club_id,member_id,new.name,new.description,'Інша діяльність','other');
 return new;
end; $$;
revoke all on function business_private.enable_community_business() from public,anon,authenticated;
create trigger community_enable_business after insert or update of business_enabled on public.communities for each row execute function business_private.enable_community_business();
-- A community is the public identity. Keep the already implemented business editor synchronized.
create function business_private.sync_community_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.club_id is not null and (new.name is distinct from old.name or new.description is distinct from old.description) then
  if not exists(select 1 from public.communities c where c.club_id=new.club_id and c.name=new.name and c.description=new.description) then
   if auth.uid() is null or business_private.my_role(new.id) not in ('owner','admin','editor') or business_private.my_role(new.id) is null then raise exception 'Not permitted to edit community identity';end if;
   update public.communities set name=new.name,description=new.description where club_id=new.club_id;
  end if;
 end if;
 return new;
end; $$;
revoke all on function business_private.sync_community_identity() from public,anon,authenticated;
create trigger business_sync_community_identity after update of name,description on public.business_companies for each row execute function business_private.sync_community_identity();
-- Disallow standalone creation, including old client versions. Trigger uses its private owner.
revoke insert on public.business_companies from authenticated;
revoke insert(name,category,category_code,description,city,contact_email,website) on public.business_companies from authenticated;
commit;
