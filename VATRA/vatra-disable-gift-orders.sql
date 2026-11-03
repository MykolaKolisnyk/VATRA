begin;
-- Платні подарунки можна буде придбавати лише після підключення
-- авторизованих платежів і підтвердження транзакції на сервері.
revoke execute on function public.vatra_gifts_place_order(text)
 from public,anon,authenticated;
revoke execute on function public.vatra_gifts_my_orders()
 from public,anon,authenticated;
revoke execute on function public.vatra_gifts_admin_orders()
 from public,anon,authenticated;
revoke execute on function public.vatra_gifts_admin_contact_order(bigint,text)
 from public,anon,authenticated;
revoke execute on function public.vatra_gifts_admin_fulfill(bigint)
 from public,anon,authenticated;

-- Для користувачів закрито старе ручне замовлення.
-- Історичні записи зберігаються в службовому архіві для обліку
-- можливих проведених оплат та оскаржень. Їх не видаляємо автоматично.
commit;

select p.proname,pg_get_function_identity_arguments(p.oid) as signature
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='vatra_gifts_place_order';