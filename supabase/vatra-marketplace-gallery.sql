begin;
alter table public.vatra_marketplace_listings
 add column image_paths text[] not null default array[]::text[];
alter table public.vatra_marketplace_listings
 add constraint vatra_market_gallery_check check (
   cardinality(image_paths)=0 or (
    array_ndims(image_paths)=1 and array_lower(image_paths,1)=1
    and cardinality(image_paths) between 1 and 8
    and array_position(image_paths,null) is null
    and image_path is not null and image_paths[1]=image_path
    and array_to_string(image_paths,',') ~ ('^'||seller_vatra_id::text||'/[a-f0-9-]{36}[.](jpg|png|webp)(,'||seller_vatra_id::text||'/[a-f0-9-]{36}[.](jpg|png|webp))*$')
   )
 );
grant select(image_paths), insert(image_paths) on public.vatra_marketplace_listings to authenticated;
alter policy vatra_market_image_read on storage.objects to authenticated using (
 bucket_id='marketplace-images' and (
  exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(objects.name,'/',1))
  or exists(select 1 from public.vatra_marketplace_listings l where (l.image_path=objects.name or objects.name=any(l.image_paths)) and l.status='active')
 )
);
commit;
