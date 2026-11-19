begin;
alter table public.business_companies add column logo_path text, add column cover_path text;
alter table public.business_companies
 add constraint business_logo_path check (logo_path is null or logo_path ~ ('^'||id::text||'/logo/[a-f0-9-]{36}[.](jpg|png|webp)$')),
 add constraint business_cover_path check (cover_path is null or cover_path ~ ('^'||id::text||'/cover/[a-f0-9-]{36}[.](jpg|png|webp)$'));
grant select(logo_path,cover_path),update(logo_path,cover_path) on public.business_companies to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('business-media','business-media',false,6291456,array['image/jpeg','image/png','image/webp']);
create function business_private.media_company(path text) returns uuid language sql immutable security invoker set search_path='' as $$
 select case when path ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/(logo|cover)/[a-f0-9-]{36}[.](jpg|png|webp)$' then split_part(path,'/',1)::uuid else null end;
$$;
revoke all on function business_private.media_company(text) from public,anon,authenticated;
grant execute on function business_private.media_company(text) to authenticated;
create policy business_media_read on storage.objects for select to authenticated using (
 bucket_id='business-media' and (select business_private.current_member()) is not null and
 (business_private.my_role(business_private.media_company(name)) in ('owner','admin','editor') or
 exists(select 1 from public.business_companies c where c.id=business_private.media_company(name) and (c.logo_path=name or c.cover_path=name))));
create policy business_media_add on storage.objects for insert to authenticated with check (
 bucket_id='business-media' and business_private.my_role(business_private.media_company(name)) in ('owner','admin','editor'));
create policy business_media_remove on storage.objects for delete to authenticated using (
 bucket_id='business-media' and business_private.my_role(business_private.media_company(name)) in ('owner','admin','editor')
 and not exists(select 1 from public.business_companies c where c.id=business_private.media_company(name) and (c.logo_path=name or c.cover_path=name)));
create table public.business_store_listings (
 company_id uuid not null references public.business_companies(id) on delete cascade,
 listing_id uuid primary key references public.marketplace_listings(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index business_store_company_idx on public.business_store_listings(company_id,created_at desc);
alter table public.business_store_listings enable row level security;
revoke all on public.business_store_listings from public,anon,authenticated;
grant select on public.business_store_listings to authenticated;
grant insert(company_id,listing_id),delete on public.business_store_listings to authenticated;
create policy business_store_read on public.business_store_listings for select to authenticated using (
 (select business_private.current_member()) is not null and
 (business_private.my_role(company_id)='owner' or exists(select 1 from public.marketplace_listings l where l.id=listing_id and l.status='active' and l.moderation_status='approved')));
create policy business_store_add on public.business_store_listings for insert to authenticated with check (
 business_private.my_role(company_id)='owner' and exists(select 1 from public.marketplace_listings l where l.id=listing_id and l.seller_vatra_id=(select business_private.current_member()) and l.status='active' and l.moderation_status='approved'));
create policy business_store_remove on public.business_store_listings for delete to authenticated using (business_private.my_role(company_id)='owner');
commit;
