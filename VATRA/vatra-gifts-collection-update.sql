-- VATRA: six new gifts, idempotent. Run after vatra-gifts-orders.sql.
INSERT INTO public.vatra_gift_catalog(code,title,category,sort_order,price_uah) VALUES
('snowglobe','Снігова куля','premium',220,45),
('letter','Листівка з теплом','premium',230,25),
('clover','Конюшина удачі','premium',240,25),
('musicbox','Музична скринька','premium',250,55),
('swan','Лебідь ніжності','premium',260,50),
('diamond','Кришталева зоря','premium',270,65)
ON CONFLICT(code) DO UPDATE SET title=excluded.title,sort_order=excluded.sort_order,price_uah=excluded.price_uah;
