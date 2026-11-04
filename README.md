# ВАТРА · соціальна мережа

Українська соціальна мережа з профілями, дописами, спільнотами, повідомленнями, подарунками та техпідтримкою. Статичний сайт публікується через GitHub Pages, дані та серверні функції працюють у Supabase.

**Відкрити сайт:** https://mykolakolisnyk.github.io/VATRA/VATRA/

## Навігація репозиторієм

| Папка | Призначення |
|---|---|
| [VATRA/](VATRA/) | **Діючий сайт**: HTML, CSS, JS, зображення та згенеровані публічні сторінки. |
| [supabase/functions/](supabase/functions/) | Edge Functions (акаунти, переклад). |
| [database/](database/) | SQL: довідкові сценарії, виконані міграції, аудити й архів. |
| [docs/](docs/) | Архітектура бази, документація функцій і налаштувань. |
| [tools/](tools/) | Перевірки коду, SEO-генератор та допоміжні скрипти. |
| [archive/](archive/) | Старі модулі, не знайдені серед підключень чинного сайту. |
| [.github/workflows/](.github/workflows/) | CI, шрифти, логотип, SEO та ручне розгортання служб. |

**Не переносити робочі файли з VATRA/** без оновлення їхніх посилань: сторінки завантажують багато CSS і JS, включно з динамічними модулями.

## Важливі файли

- [Головна сторінка](VATRA/index.html), [вхід](VATRA/auth.html), [реєстрація](VATRA/register.html).
- [Основна логіка](VATRA/script.js), [Supabase-адаптер](VATRA/vatra-backend.js).
- [Структура бази](docs/DATABASE.md), [SQL-каталог](database/README.md), [документація модулів](docs/README.md).

**Основне сховище сайту — public.app_data**, додаткові спеціалізовані таблиці працюють окремо. Не видаляти public.profiles або public.private_profiles: їх використовує тригер реєстрації. Історичні SQL-файли не є готовим планом послідовного виконання.

## Перевірки (Node.js 22+)

```bash
node tools/check-vatra.mjs
node tools/check-vatra-layout.mjs
```

GitHub Actions перевіряє pull requests і main. Генератор SEO підтримує сторінки VATRA/people/, VATRA/communities/ та sitemap.xml — не видаляйте їх як «зайві».

## Розгортання та безпека

- Фронтенд: GitHub Pages, каталог VATRA/.
- Edge Functions: [ручний workflow](.github/workflows/vatra-secure-services.yml) (потрібні налаштовані секрети у GitHub, не зберігати секретні ключі в репозиторії).
- SQL: перед кожною зміною — резервна копія, аудит залежностей, перевірка RLS, тестування реєстрації/публікацій/повідомлень.
- **Захистіть main:** GitHub → Settings → Rules → Rulesets. Врахуйте, що SEO та інші workflows автоматично записують згенеровані файли.

**Порядок карток у Supabase Schema Visualizer** налаштовується в інтерфейсі. Не перейменовуйте та не переносіть PostgreSQL-таблиці в інші схеми лише заради візуального порядку.
