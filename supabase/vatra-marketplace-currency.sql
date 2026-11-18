begin;
alter table public.vatra_marketplace_listings add column currency text not null default 'UAH';
alter table public.vatra_marketplace_listings add constraint vatra_marketplace_currency_check check (currency in ('UAH','USD','EUR'));
grant select(currency), insert(currency) on public.vatra_marketplace_listings to authenticated;
commit;
