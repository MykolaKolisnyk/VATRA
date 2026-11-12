# VATRA — шаблони листів Supabase

У VATRA використовується **тільки email + пароль**. Телефон, SMS, вхід або реєстрація за номером не передбачені.

Ці файли містять **оригінальні тіла листів для Supabase** (не копії CSS і не додаткові версії). Кожен файл потрібно один раз вставити у відповідне поле **Body → Source** у [Supabase Dashboard](https://supabase.com/dashboard/project/rjasunoawrxvetwadylh/auth/templates) та натиснути **Save changes**. Коміт у GitHub **не змінює автоматично** активні шаблони Supabase.

| Розділ у Supabase | HTML-файл | Subject для поля Supabase |
|---|---|---|
| Confirm sign up | `confirmation.html` | `{{ if eq .Data.preferred_locale "en" }}VATRA · Confirm email{{ else }}VATRA · Підтвердження пошти{{ end }}` |
| Invite user | `invite.html` | `{{ if eq .Data.preferred_locale "en" }}VATRA · Invitation{{ else }}VATRA · Запрошення{{ end }}` |
| Magic link or OTP | `magic-link.html` | `{{ if eq .Data.preferred_locale "en" }}VATRA · Sign-in code{{ else }}VATRA · Код входу{{ end }}` |
| Change email address | `email-change.html` | `{{ if eq .Data.preferred_locale "en" }}VATRA · Confirm new email{{ else }}VATRA · Підтвердження нової пошти{{ end }}` |
| Reset password | `recovery.html` | `{{ if eq .Data.preferred_locale "en" }}VATRA · Password recovery{{ else }}VATRA · Відновлення пароля{{ end }}` |
| Reauthentication | `reauthentication.html` | `{{ if eq .Data.preferred_locale "en" }}VATRA · Verification code{{ else }}VATRA · Код підтвердження{{ end }}` |
| Password changed (Security) | `password-changed.html` | `{{ if eq .Data.preferred_locale "en" }}VATRA · Password changed{{ else }}VATRA · Пароль змінено{{ end }}` |
| Email address changed (Security) | `email-address-changed.html` | `{{ if eq .Data.preferred_locale "en" }}VATRA · Email changed{{ else }}VATRA · Пошту змінено{{ end }}` |

## Запуск VATRA на Supabase Pro

Фінальний реліз VATRA планується на **Supabase Pro**. Усі шаблони в цьому каталозі готуються для продакшн-використання з цим тарифом: Confirm sign up, Invite, Magic link, Change email, Reset password, Reauthentication та два Security Notifications. Під час запуску налаштуйте власний надійний SMTP-відправник, SPF, DKIM і DMARC та дозволені URL для переходів. **Не перемикайте тариф і не змінюйте активні шаблони без окремої команди.**

Перед застосуванням у продакшні виконайте `go run tools/email-template-audit.go`: тест відтворює всі вісім HTML/Go-шаблонів українською й англійською, підставляє тестові OTP і адреси та перевіряє HTTPS-посилання. Він не відправляє листів і не змінює налаштування Supabase. Після вставлення потрібні окремі тестові листи до реального поштового клієнта (мобільний Gmail, Apple Mail та Outlook) і перевірка SMTP/URL allow list. Перш ніж замінювати робочі шаблони, збережіть їхні попередні версії.

## Підтвердження пошти з іншого пристрою

**Обов'язково** скопіюйте оновлений повний вміст `email-templates/confirmation.html` у **Supabase → Authentication → Email Templates → Confirm sign up → Body (Source)** і збережіть. Зміна у GitHub не оновлює активний шаблон Supabase. Посилання використовує канонічну адресу GitHub Pages та одноразовий `token_hash`, який сторінка `/VATRA/verify` перевіряє через Supabase і відразу прибирає з адресного рядка. Недійсний токен не надає доступу. Не копіюйте реальні одноразові посилання з листів у листування або логи.

## Мова листа

Поточна форма створення акаунта в `assets/js/create-account.js` передає `preferred_locale` зі значенням `uk` або `en` у метаданих Supabase. **Саме `.Data.preferred_locale`**, а не `.Data.preferredLanguage`, використано в усіх восьми шаблонах.

- Для `en` відображається англійський текст.
- Для `uk` або відсутніх метаданих — український.
- Після реєстрації мова листів визначається збереженими метаданими акаунта; лише зміна мови сторінки без зміни цих метаданих не перемикає мову автоматичного листа.
- Теми **Subject** тепер записані як умовні Go-шаблони: `VATRA · ...` для `en` або `uk` (якщо значення `preferred_locale` відсутнє — українська). Вставляйте у **Subject** весь рядок `{{ if ... }}...{{ else }}...{{ end }}` із таблиці вище, не лише відображувану назву.
- Теми потрібно зберегти окремо в **Supabase → Authentication → Emails**. Коміт у GitHub **не оновлює** активне поле Subject. Після збереження перевірте реальні листи при `uk` та `en`, особливо для Security Notifications: наявність метаданих мови в конкретній події визначає фактичний результат. Не вважайте рендеринг у локальному тесті підтвердженням доставки.

## Безпечні змінні Supabase та маршрути VATRA

В усіх п’яти шаблонах із посиланнями використовується одноразовий `{{ .TokenHash }}`. Це не звичайний пароль і не довгостроковий токен. Відповідний тип у URL має збігатися з перевіркою `verifyOtp`:

| Шаблон | Сторінка призначення | Тип `verifyOtp` |
|---|---|---|
| `confirmation.html` | `/VATRA/verify` | `email` |
| `invite.html` | `/VATRA/verify` | `invite` |
| `magic-link.html` | `/VATRA/verify` | `magiclink` |
| `email-change.html` | `/VATRA/verify` | `email_change` |
| `recovery.html` | `/VATRA/reset` | `recovery` |

**Важливо:** код `{{ .Token }}` у `magic-link.html` та `recovery.html` — альтернативний одноразовий спосіб підтвердження. `{{ .RedirectTo }}` у шаблоні відновлення веде до форми введення коду; пряме посилання перевіряється за `TokenHash`. Для підтвердження нової пошти використовується також `{{ .NewEmail }}`.

- **Повторна автентифікація:** `{{ .Token }}` у `reauthentication.html`; це код для окремої захищеної дії, а не посилання для входу.
- **Сповіщення про зміну пароля:** `password-changed.html` без OTP; посилання веде на сторінку відновлення VATRA.
- **Сповіщення про зміну адреси:** `email-address-changed.html` із `{{ .OldEmail }}` і `{{ .Email }}` — лише повідомлення, не підтвердження.

У всіх восьми шаблонах оформлення зроблено вбудованими CSS-властивостями (`style`) навмисно для підтримки поштових клієнтів. Кожен HTML-файл є основною версією; файлів `v2`, `fix-2` чи `style-2` немає. Збереження файлів у GitHub **не змінює** поточні шаблони в Supabase Dashboard; кожен із них потрібно застосувати окремо. Доставку, поштовий клієнт і виконання реальних посилань перевіряйте тестовими адресами після застосування шаблонів. Перевірте особливо зміну email із налаштуванням Secure Email Change.

Реєстрація підтверджується **посиланням**, оскільки поточна форма реєстрації не має окремого екрану введення коду. Відновлення пароля підтримує **код та посилання**.

## Перед запуском

1. Переконайтеся, що **Site URL** і **Redirect URLs** у Supabase відповідають `https://mykolakolisnyk.github.io/VATRA/` та кореневим `/VATRA/verify` та `/VATRA/reset`.
2. У **SMTP Settings** налаштовується відправник листів VATRA. Вміст HTML-шаблонів не змінює ім’я чи адресу SMTP-відправника.
3. Після збереження шаблону надішліть тестове підтвердження та відновлення пароля, перевірте лист українською й англійською та завершення дії в браузері. Не вставляйте у репозиторій приватні ключі чи паролі.

Інші типи шаблонів, як-от телефонні сповіщення чи зміна номера, **не потрібні** і не додаються.

## Два сповіщення безпеки

У Supabase → Authentication → Emails → Security треба окремо ввімкнути **Password changed** і **Email address changed** та натиснути **Save changes**. Далі відкрийте кожний шаблон, скопіюйте відповідний HTML з GitHub у **Body → Source**, введіть відповідний **Subject** з таблиці вище та збережіть. Зміни в GitHub самі по собі не змінюють листи в Supabase. Використовуйте **Preview**, а потім надішліть тестовий лист. Жодних телефонних сповіщень не вмикаємо.
