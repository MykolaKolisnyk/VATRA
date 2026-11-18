begin;
alter table public.vatra_marketplace_listings
 drop constraint vatra_market_gallery_check,
 add constraint vatra_market_gallery_check check (
  cardinality(image_paths)=0 or (
   array_ndims(image_paths)=1 and array_lower(image_paths,1)=1
   and cardinality(image_paths) between 1 and 10
   and array_position(image_paths,null) is null
   and image_path is not null and image_paths[1]=image_path
   and array_to_string(image_paths,',') ~ ('^'||seller_vatra_id::text||'/[a-f0-9-]{36}[.](jpg|png|webp)(,'||seller_vatra_id::text||'/[a-f0-9-]{36}[.](jpg|png|webp))*$')
  )
 ),
 drop constraint vatra_marketplace_listings_category_check,
 add constraint vatra_marketplace_listings_category_check check(category in ('electronics','clothes','home','transport','sport','other','rentals','property','toys','free','music','family','entertainment','pets','office','tools','garden','hobbies')),
 add column item_condition text check(item_condition in ('new','like_new','good','fair')),
 add column listing_type text not null default 'item' check(listing_type in ('item','vehicle','property'));
grant select(item_condition,listing_type), insert(item_condition,listing_type) on public.vatra_marketplace_listings to authenticated;
commit;
