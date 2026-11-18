begin;

alter table public.feed_posts add column if not exists is_clip boolean not null default false;
alter table public.feed_posts add constraint vatra_clip_single_video check (
 not is_clip or (
  media_kind is null and media_path is null and shared_post_id is null
  and jsonb_array_length(media_items)=1
  and media_items->0->>'media_kind'='video'
  and split_part(media_items->0->>'media_path','/',1)=author_vatra_id::text
  and (media_items->0->>'media_path') ~ '^[1-9][0-9]*/posts/[a-f0-9-]{36}[.](mp4|webm)$'
 )
);
create index if not exists vatra_clips_created_idx on public.feed_posts(created_at desc) where is_clip and archived_at is null;

create table public.vatra_marketplace_listings (
 id uuid primary key default gen_random_uuid(),
 seller_id uuid not null default auth.uid() references public.accounts(user_id) on delete cascade,
 seller_vatra_id bigint not null references public.accounts(vatra_id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 3 and 100),
 description text not null check(char_length(btrim(description)) between 1 and 2000),
 category text not null check(category in ('electronics','clothes','home','transport','sport','other')),
 price numeric(12,2) not null check(price>=0 and price<=999999999),
 city text not null default '' check(char_length(city)<=100),
 image_path text check(image_path is null or (split_part(image_path,'/',1)=seller_vatra_id::text and image_path ~ '^[1-9][0-9]*/[a-f0-9-]{36}[.](jpg|png|webp)$')),
 status text not null default 'active' check(status in ('active','sold')),
 created_at timestamptz not null default now()
);
alter table public.vatra_marketplace_listings enable row level security;
revoke all on public.vatra_marketplace_listings from public,anon,authenticated;
grant select(id,seller_vatra_id,title,description,category,price,city,image_path,status,created_at) on public.vatra_marketplace_listings to authenticated;
grant insert(seller_vatra_id,title,description,category,price,city,image_path) on public.vatra_marketplace_listings to authenticated;
grant update(status) on public.vatra_marketplace_listings to authenticated;
grant delete on public.vatra_marketplace_listings to authenticated;
create policy vatra_market_read on public.vatra_marketplace_listings for select to authenticated using (
 seller_id=(select auth.uid()) or (status='active' and not public.vatra_has_block_between(seller_vatra_id))
);
create policy vatra_market_create on public.vatra_marketplace_listings for insert to authenticated with check (
 seller_id=(select auth.uid()) and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=seller_vatra_id)
);
create policy vatra_market_update on public.vatra_marketplace_listings for update to authenticated using (seller_id=(select auth.uid())) with check(seller_id=(select auth.uid()));
create policy vatra_market_delete on public.vatra_marketplace_listings for delete to authenticated using(seller_id=(select auth.uid()));
create index vatra_market_active_idx on public.vatra_marketplace_listings(created_at desc) where status='active';
create index vatra_market_seller_idx on public.vatra_marketplace_listings(seller_vatra_id,created_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('marketplace-images','marketplace-images',false,6291456,array['image/jpeg','image/png','image/webp']);
create policy vatra_market_image_insert on storage.objects for insert to authenticated with check(
 bucket_id='marketplace-images' and name ~ '^[1-9][0-9]*/[a-f0-9-]{36}[.](jpg|png|webp)$'
 and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(name,'/',1))
);
create policy vatra_market_image_read on storage.objects for select to authenticated using(
 bucket_id='marketplace-images' and (
 exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(name,'/',1))
 or exists(select 1 from public.vatra_marketplace_listings l where l.image_path=name and l.status='active')
 )
);
create policy vatra_market_image_delete on storage.objects for delete to authenticated using(
 bucket_id='marketplace-images' and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id::text=split_part(name,'/',1))
);

create table public.vatra_verification_requests(
 vatra_id bigint primary key references public.accounts(vatra_id) on delete cascade,
 applicant_id uuid not null default auth.uid() references public.accounts(user_id) on delete cascade,
 reason text not null check(char_length(btrim(reason)) between 10 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.vatra_verification_requests enable row level security;
revoke all on public.vatra_verification_requests from public,anon,authenticated;
grant select(vatra_id,reason,status,created_at) on public.vatra_verification_requests to authenticated;
grant insert(vatra_id,reason) on public.vatra_verification_requests to authenticated;
create policy vatra_verify_read_own on public.vatra_verification_requests for select to authenticated using(applicant_id=(select auth.uid()));
create policy vatra_verify_apply_own on public.vatra_verification_requests for insert to authenticated with check(
 applicant_id=(select auth.uid()) and exists(select 1 from public.accounts a where a.user_id=(select auth.uid()) and a.vatra_id=vatra_verification_requests.vatra_id)
 and not exists(select 1 from public.verified_accounts v where v.vatra_id=vatra_verification_requests.vatra_id)
);

commit;
