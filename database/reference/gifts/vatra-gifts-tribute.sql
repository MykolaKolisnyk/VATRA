-- VATRA · tribute gifts, original site designs, NOT official state awards.
-- Run AFTER VATRA/vatra-gifts.sql.
insert into public.vatra_gift_catalog(code,title,category,event_month,event_day,sort_order,enabled)
values
('zsu_tribute','Сила ЗСУ','premium',null,null,210,true),
('ngu_tribute','Міць НГУ','premium',null,null,220,true),
('dpsu_tribute','Вартові кордону ДПСУ','premium',null,null,230,true)
on conflict(code) do update
set title=excluded.title,category=excluded.category,event_month=null,
event_day=null,sort_order=excluded.sort_order,enabled=excluded.enabled;
-- Online payments are deliberately disabled until a verified payment provider and payout process exist.
