begin;
alter table public.vatra_marketplace_listings
 drop constraint vatra_marketplace_listings_category_check,
 add constraint vatra_marketplace_listings_category_check check (category in ('transport','property','rentals','free','electronics','clothes','accessories','furniture','home','garden','tools','sport','toys','family','music','books','pets','jewelry','beauty','art','collectibles','business','office','auto_parts','travel','agriculture','hobbies','entertainment','other')),
 drop constraint vatra_marketplace_listings_listing_type_check,
 add constraint vatra_marketplace_listings_listing_type_check check (listing_type in ('item','vehicle','property','rent','free')),
 add column subcategory text,
 add column details jsonb not null default '{}'::jsonb,
 add constraint vatra_marketplace_subcategory_check check (subcategory is null or ((category='transport' and subcategory in ('cars','motorcycles','commercial','trailers','other'))
 or (category='property' and subcategory in ('apartments','houses','land','commercial','other'))
 or (category='rentals' and subcategory in ('apartments','houses','rooms','commercial','other'))
 or (category='free' and subcategory in ('home','clothes','electronics','family','other'))
 or (category='electronics' and subcategory in ('phones','computers','tablets','tv','components','cameras','other'))
 or (category='clothes' and subcategory in ('women','men','children','shoes','other'))
 or (category='accessories' and subcategory in ('bags','watches','belts','other'))
 or (category='furniture' and subcategory in ('sofas','beds','tables','storage','other'))
 or (category='home' and subcategory in ('appliances','kitchen','textiles','decor','other'))
 or (category='garden' and subcategory in ('equipment','tools','outdoor','other'))
 or (category='tools' and subcategory in ('power','hand','materials','plumbing','other'))
 or (category='sport' and subcategory in ('fitness','bicycles','team','winter','other'))
 or (category='toys' and subcategory in ('toys','board','constructors','other'))
 or (category='family' and subcategory in ('strollers','furniture','school','other'))
 or (category='music' and subcategory in ('strings','keys','drums','audio','other'))
 or (category='books' and subcategory in ('fiction','education','magazines','other'))
 or (category='pets' and subcategory in ('accessories','beds','toys','other'))
 or (category='jewelry' and subcategory in ('rings','necklaces','bracelets','earrings','other'))
 or (category='beauty' and subcategory in ('cosmetics','hair','tools','other'))
 or (category='art' and subcategory in ('paintings','sculptures','supplies','other'))
 or (category='collectibles' and subcategory in ('figures','postcards','memorabilia','other'))
 or (category='business' and subcategory in ('retail','industrial','packaging','other'))
 or (category='office' and subcategory in ('stationery','printers','furniture','other'))
 or (category='auto_parts' and subcategory in ('wheels','parts','accessories','other'))
 or (category='travel' and subcategory in ('tents','backpacks','camping','other'))
 or (category='agriculture' and subcategory in ('machinery','tools','parts','other'))
 or (category='hobbies' and subcategory in ('sewing','models','materials','other'))
 or (category='entertainment' and subcategory in ('discs','consoles','equipment','other'))
 or (category='other' and subcategory in ('other')))),
 add constraint vatra_marketplace_free_price_check check (listing_type <> 'free' or (category='free' and price=0)),
 add constraint vatra_marketplace_new_type_category_check check (subcategory is null or case listing_type when 'vehicle' then category='transport' when 'property' then category='property' when 'rent' then category='rentals' when 'free' then category='free' else category not in ('transport','rentals','property','free') end),
 add constraint vatra_marketplace_details_check check (jsonb_typeof(details)='object' and octet_length(details::text)<=2000 and (details - array['brand','model','year','mileage','fuel','transmission','area','rooms','floor','size'])='{}'::jsonb
 and (not (details ? 'brand') or (jsonb_typeof(details->'brand')='string' and char_length(details->>'brand') between 1 and 70))
 and (not (details ? 'model') or (jsonb_typeof(details->'model')='string' and char_length(details->>'model') between 1 and 70))
 and (not (details ? 'year') or (jsonb_typeof(details->'year')='string' and char_length(details->>'year') between 1 and 70))
 and (not (details ? 'mileage') or (jsonb_typeof(details->'mileage')='string' and char_length(details->>'mileage') between 1 and 70))
 and (not (details ? 'fuel') or (jsonb_typeof(details->'fuel')='string' and char_length(details->>'fuel') between 1 and 70))
 and (not (details ? 'transmission') or (jsonb_typeof(details->'transmission')='string' and char_length(details->>'transmission') between 1 and 70))
 and (not (details ? 'area') or (jsonb_typeof(details->'area')='string' and char_length(details->>'area') between 1 and 70))
 and (not (details ? 'rooms') or (jsonb_typeof(details->'rooms')='string' and char_length(details->>'rooms') between 1 and 70))
 and (not (details ? 'floor') or (jsonb_typeof(details->'floor')='string' and char_length(details->>'floor') between 1 and 70))
 and (not (details ? 'size') or (jsonb_typeof(details->'size')='string' and char_length(details->>'size') between 1 and 70)));
grant select(subcategory,details), insert(subcategory,details) on public.vatra_marketplace_listings to authenticated;
commit;
