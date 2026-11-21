# VATRA — робоча структура та збірка

Сторінки `*.html`, `sw.js` та `assets/` зберігаються в корені — ці адреси потрібні сайту GitHub Pages. Розробницькі файли відокремлені в `_development/`.

```text
VATRA/
├── index.html, feed.html, profile.html, messenger.html, …
├── 404.html, offline.html, maintenance.html, sw.js
├── assets/
│   ├── js/                JavaScript сайту
│   ├── css/               Стилі сторінок
│   ├── i18n/              Переклади
│   ├── logo/, vatryk/     Графіка
│   └── fonts/             Шрифти
├── _development/
│   ├── tests/smoke/       Функціональні перевірки
│   ├── tests/audit/       Аудити CSS, SEO, перекладів, продуктивності
│   ├── tools/             Збірка і контроль версій JS/CSS
│   ├── supabase/          SQL-міграції, функції, операції
│   ├── docs/              Технічні рішення та обмеження
│   └── email-templates/   Шаблони листів Supabase
└── .github/workflows/     Автоматичні перевірки до релізу
```

## Правила

- Не створювати повторних HTML, JS або CSS під іменами `v2`, `final` тощо.
- Поведінка сторінок — в `assets/js/`, стилі — в `assets/css/`; спільний код не дублювати.
- Тести, SQL та пояснення не завантажуються браузером як частина UI.
- Історичні міграції не видаляти зі сховища до надійного резервного копіювання й завершення розробки.
- Продовжувати працювати з `_development/` до релізу; при видаленні цієї папки прибрати або адаптувати CI у `.github/workflows/check-site.yml`.

## Команди з кореня

```bash
node _development/tools/revision-assets.mjs
npm install --no-save --no-package-lock esbuild@0.28.2
node _development/tools/build-static.mjs
```

Збірка `dist/` містить тільки публічні файли сайту: HTML, `assets/`, `sw.js` та необхідні маніфести. `_development/` і `.github/` до `dist/` не потрапляють. Перед зміною способу публікації GitHub Pages необхідна окрема перевірка.

`_development/supabase/` — лише вихідні файли, не сама база даних. Видалення папки з GitHub не видаляє вже застосовані SQL-міграції, базу та розгорнуті Edge Functions у Supabase.

Безпека Messenger описана в `_development/docs/messenger-security.md`; поточне шифрування ще потребує незалежної перевірки.
