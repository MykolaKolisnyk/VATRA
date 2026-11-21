begin;
create table public.business_categories(
 code text primary key,
 group_code text not null,
 group_uk text not null,
 group_en text not null,
 name_uk text not null,
 name_en text not null,
 sort_order integer not null unique
);
insert into public.business_categories(code,group_code,group_uk,group_en,name_uk,name_en,sort_order) values
('barber','beauty','Краса та догляд','Beauty & care','Барбершоп','Barbershop',1),
('hair','beauty','Краса та догляд','Beauty & care','Перукарня','Hair salon',2),
('beauty-salon','beauty','Краса та догляд','Beauty & care','Салон краси','Beauty salon',3),
('nails','beauty','Краса та догляд','Beauty & care','Манікюр і педикюр','Nail salon',4),
('spa','beauty','Краса та догляд','Beauty & care','SPA та масаж','Spa & massage',5),
('cosmetics','beauty','Краса та догляд','Beauty & care','Косметика та парфумерія','Cosmetics & perfume',6),
('restaurant','food','Їжа та напої','Food & drink','Ресторан','Restaurant',101),
('cafe','food','Їжа та напої','Food & drink','Кафе та кав’ярня','Cafe & coffee shop',102),
('bakery','food','Їжа та напої','Food & drink','Пекарня та кондитерська','Bakery & pastry shop',103),
('catering','food','Їжа та напої','Food & drink','Кейтеринг','Catering',104),
('food-shop','food','Їжа та напої','Food & drink','Продуктовий магазин','Grocery store',105),
('food-production','food','Їжа та напої','Food & drink','Виробництво продуктів','Food production',106),
('online-shop','retail','Торгівля','Retail','Інтернет-магазин','Online store',201),
('clothes','retail','Торгівля','Retail','Одяг і взуття','Clothing & footwear',202),
('electronics','retail','Торгівля','Retail','Електроніка','Electronics',203),
('home-goods','retail','Торгівля','Retail','Товари для дому','Home goods',204),
('flowers','retail','Торгівля','Retail','Квіти та подарунки','Flowers & gifts',205),
('jewelry','retail','Торгівля','Retail','Ювелірні вироби','Jewelry',206),
('wholesale','retail','Торгівля','Retail','Оптова торгівля','Wholesale',207),
('auto-service','auto','Авто та транспорт','Auto & transport','СТО та автосервіс','Auto repair',301),
('car-wash','auto','Авто та транспорт','Auto & transport','Автомийка','Car wash',302),
('auto-parts','auto','Авто та транспорт','Auto & transport','Автозапчастини','Auto parts',303),
('transport','auto','Авто та транспорт','Auto & transport','Перевезення і логістика','Transport & logistics',304),
('car-rental','auto','Авто та транспорт','Auto & transport','Прокат автомобілів','Car rental',305),
('clinic','health','Здоров’я та спорт','Health & fitness','Медичний центр','Medical centre',401),
('dentist','health','Здоров’я та спорт','Health & fitness','Стоматологія','Dentistry',402),
('pharmacy','health','Здоров’я та спорт','Health & fitness','Аптека','Pharmacy',403),
('fitness','health','Здоров’я та спорт','Health & fitness','Фітнес-клуб','Fitness club',404),
('rehab','health','Здоров’я та спорт','Health & fitness','Реабілітація','Rehabilitation',405),
('veterinary','health','Здоров’я та спорт','Health & fitness','Ветеринарна клініка','Veterinary clinic',406),
('construction','home','Будівництво та нерухомість','Construction & property','Будівельна компанія','Construction company',501),
('repair','home','Будівництво та нерухомість','Construction & property','Ремонт та оздоблення','Renovation & finishing',502),
('real-estate','home','Будівництво та нерухомість','Construction & property','Агентство нерухомості','Real estate agency',503),
('furniture','home','Будівництво та нерухомість','Construction & property','Меблі та інтер’єр','Furniture & interiors',504),
('cleaning','home','Будівництво та нерухомість','Construction & property','Клінінг','Cleaning services',505),
('landscaping','home','Будівництво та нерухомість','Construction & property','Ландшафт і сад','Landscaping & garden',506),
('legal','professional','Професійні послуги','Professional services','Юридичні послуги','Legal services',601),
('accounting','professional','Професійні послуги','Professional services','Бухгалтерія','Accounting',602),
('consulting','professional','Професійні послуги','Professional services','Консалтинг','Consulting',603),
('marketing','professional','Професійні послуги','Professional services','Маркетинг та реклама','Marketing & advertising',604),
('it','professional','Професійні послуги','Professional services','IT та розробка','IT & software',605),
('design','professional','Професійні послуги','Professional services','Дизайн','Design',606),
('insurance','professional','Професійні послуги','Professional services','Страхування','Insurance',607),
('school','education','Освіта','Education','Навчальний заклад','Educational institution',701),
('courses','education','Освіта','Education','Навчальні курси','Training courses',702),
('language','education','Освіта','Education','Мовна школа','Language school',703),
('tutor','education','Освіта','Education','Репетиторство','Tutoring',704),
('childcare','education','Освіта','Education','Дитячий центр','Childcare centre',705),
('hotel','travel','Туризм та дозвілля','Travel & leisure','Готель','Hotel',801),
('tour','travel','Туризм та дозвілля','Travel & leisure','Туристична агенція','Travel agency',802),
('events','travel','Туризм та дозвілля','Travel & leisure','Організація заходів','Event planning',803),
('photo','travel','Туризм та дозвілля','Travel & leisure','Фото та відеостудія','Photo & video studio',804),
('entertainment','travel','Туризм та дозвілля','Travel & leisure','Розваги','Entertainment',805),
('manufacturing','industry','Виробництво та агро','Industry & agriculture','Виробництво','Manufacturing',901),
('farm','industry','Виробництво та агро','Industry & agriculture','Фермерське господарство','Farm',902),
('craft','industry','Виробництво та агро','Industry & agriculture','Ремесла та майстерні','Crafts & workshops',903),
('printing','industry','Виробництво та агро','Industry & agriculture','Поліграфія','Printing',904),
('nonprofit','community','Організації та інше','Organisations & other','Громадська організація','Nonprofit organisation',1001),
('charity','community','Організації та інше','Organisations & other','Благодійний фонд','Charity',1002),
('public-institution','community','Організації та інше','Organisations & other','Установа','Institution',1003),
('other','community','Організації та інше','Organisations & other','Інша діяльність','Other business',1004);
alter table public.business_categories enable row level security;
revoke all on public.business_categories from public,anon,authenticated;
grant select on public.business_categories to authenticated;
create policy business_categories_read on public.business_categories for select to authenticated using((select business_private.current_member()) is not null);
alter table public.business_companies add column category_code text references public.business_categories(code);
create index business_companies_category_idx on public.business_companies(category_code);
grant select(category_code),insert(category_code),update(category_code) on public.business_companies to authenticated;
-- Preserve existing free-text categories until the owner chooses a standard one.
update public.business_companies c set category_code=d.code from public.business_categories d
 where lower(trim(c.category)) in (lower(d.name_uk),lower(d.name_en));
create function business_private.normalize_category() returns trigger language plpgsql set search_path='' as $$
declare label text;
begin
 if new.category_code is not null then
  select name_uk into label from public.business_categories where code=new.category_code;
  if label is null then raise exception 'Unknown business category';end if;
  new.category:=label;
 elsif tg_op='INSERT' or new.category is distinct from old.category or old.category_code is not null then
  raise exception 'Choose a business category';
 end if;
 return new;
end; $$;
revoke all on function business_private.normalize_category() from public,anon,authenticated;
create trigger business_normalize_category before insert or update of category,category_code on public.business_companies
 for each row execute function business_private.normalize_category();
commit;
