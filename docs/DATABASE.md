# База даних ВАТРА: логічний порядок

Перевірено через підключення до Supabase проєкту **rjasunoawrxvetwadylh** 4 листопада 2026 року. Нижче — логічний каталог, а не інструкція створити нові таблиці.

| № | Розділ | Робочі таблиці public |
|---|---|---|
| 01 | Ядро | app_data |
| 02 | Акаунти | profiles, private_profiles, vatra_account_lifecycle, vatra_account_tombstones |
| 03 | Дописи | vatra_scheduled_posts |
| 04 | Подарунки | vatra_gift_catalog, vatra_gift_instances, vatra_gift_claims, vatra_gift_preferences, vatra_gift_orders, vatra_gift_audit |
| 05 | Реклама | vatra_promotions |
| 06 | Модерація | vatra_moderation_cases, vatra_moderation_account_bans, vatra_moderation_group_bans, vatra_moderation_hidden_content, vatra_moderation_audit |
| 07 | Команда та верифікація | vatra_staff_members, vatra_network_owners, vatra_verification_admins, vatra_verification_requests, vatra_verified_groups, vatra_verified_notices |
| 08 | Підтримка | vatra_support_tickets, vatra_support_messages, vatra_support_alerts |
| 09 | Система | vatra_otp_codes, vatra_request_buckets |

**public.app_data** — поточне головне сховище сайту. SQL-права/RLS, JS-адаптер, друзі, дописи, спільноти й повідомлення від нього залежать. Тригер auth.users створює записи в public.profiles і public.private_profiles.

Застарілі порожні public.communities та public.community_members переміщено до **vatra_archive**; там також зберігаються копії попередніх схем. Це не робочі дані сайту.

## Таблиці за порядком

- [Виконати read-only запит на відсортований список](../database/audits/ordered-live-tables.sql) у [Supabase SQL Editor](https://supabase.com/dashboard/project/rjasunoawrxvetwadylh/sql/new).
- **Database → Schema Visualizer**: розташуйте картки вручну за дев'ятьма групами. SQL не керує координатами елементів на екрані.
- Не перейменовуйте робочі SQL-таблиці й не переміщуйте їх у PostgreSQL-схеми лише заради косметики: це зламає наявні SQL/RPC/API-посилання без зміни коду.

## Безпека та зміни

- RLS робочих таблиць увімкнено; частину привілейованих SQL-функцій необхідно аудіювати окремо.
- У **vatra_archive** звичайні ролі anon та authenticated під час перевірки не мали USAGE/SELECT, але в частини архівних таблиць RLS вимкнено. Зберігайте архів приватним.
- Дев'ять FK-індексів і обмеження анонімного виконання восьми службових функцій застосовано 4 листопада.
- Не виконувати DROP CASCADE над робочими таблицями без доказу відсутності залежностей і резервної копії.
