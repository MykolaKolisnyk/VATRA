# VATRA

Сучасна соціальна мережа з можливостями для спілкування, творчості, бізнесу та майбутнього маркетплейсу.

## Структура

- `index.html` — переадресація до входу
- `auth.html` — вхід
- `register.html` — реєстрація
- `forgot.html` — відновлення пароля
- `reset.html` — створення нового пароля
- `account.html` — тестова захищена сторінка після входу
- `legal.html` — попередні умови тестового запуску
- `assets/css/auth.css` — єдині стилі авторизації
- `assets/js/auth.js` — логіка Supabase Auth
- `assets/logo/` — офіційні SVG логотипа VATRA

## Налаштування Supabase

У проєкті Supabase VATRA встановіть **Site URL** `https://mykolakolisnyk.github.io/VATRA/` і додайте дозволені Redirect URLs:
- `https://mykolakolisnyk.github.io/VATRA/account.html`
- `https://mykolakolisnyk.github.io/VATRA/reset.html`

Підтвердження email та відновлення пароля вимагають налаштованого надсилання email. Для реального публічного запуску підключіть SMTP-провайдера; стандартний поштовий сервіс Supabase має обмеження. Не додавайте до репозиторію секретні ключі. У клієнті використовується лише публічний publishable key.

Номер телефону поки не підтримується — потрібен окремий SMS-провайдер. Повна соціальна платформа ще розробляється.
