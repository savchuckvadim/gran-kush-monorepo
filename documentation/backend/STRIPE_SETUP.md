# Подключение Stripe: пошагово

Как устроен биллинг — [BILLING.md](BILLING.md). Здесь — что сделать руками, чтобы оплата заработала.

Порядок: **тестовый режим** (оплата тестовой картой, денег нет) → проверка → **боевой режим**
(настоящие карты). Код для обоих режимов один, меняются только ключи и id цен.

Названия пунктов меню Stripe иногда меняются. Если пункт не находится, ищите по поиску в кабинете Stripe
(«API keys», «Webhooks», «Customer portal»).

---

## 1. Аккаунт

1. Зарегистрируйтесь на [dashboard.stripe.com](https://dashboard.stripe.com/register), страна — España.
2. Сразу после регистрации доступен **тестовый режим** (Sandbox / Test mode, переключатель в кабинете).
   Всё, что ниже до раздела 8, делается в нём.
3. Параллельно заполните данные бизнеса для боевого режима: проверка идёт дольше, чем настройка.
   - Тип: autónomo или sociedad, NIF/CIF, адрес, IBAN для выплат.
   - Описание продукта: «SaaS: облачная CRM по подписке для клубов и сервисного бизнеса (членство, касса,
     склад, посещаемость). Продаём только программное обеспечение».
   - Сайт: `https://paf-paf.app`. Stripe смотрит, что на сайте есть цены, контакты, условия и политика
     возвратов — без юридических страниц (задача в Notion) проверку можно не пройти.
   - Если Stripe спросит про связь с каннабисом: вы продаёте только софт, товары не продаёте и не
     принимаете за них оплату.

## 2. Тарифы (Products и Prices)

Product catalog → **Add product**. Для каждого тарифа — продукт с повторяющейся ценой (Recurring) в EUR.

| Продукт | Цена | Период | Код тарифа у нас |
|---|---|---|---|
| PafPaf Prueba | 5,00 € | Monthly | `prueba-month` |
| PafPaf Barrio | 25,00 € | Monthly | `barrio-month` |
| PafPaf Barrio | 240,00 € | Yearly | `barrio-year` |
| PafPaf Club | 49,00 € | Monthly | `club-month` |
| PafPaf Club | 468,00 € | Yearly | `club-year` |
| PafPaf Cadena | 99,00 € | Monthly | `cadena-month` |
| PafPaf Cadena | 948,00 € | Yearly | `cadena-year` |

- Цена — **без IVA**, как на сайте. Как добавить IVA — раздел 6.
- У каждой цены есть id вида `price_1Q…` (в карточке цены). Он понадобится в разделе 5.
- Для первой проверки достаточно одного продукта «PafPaf Prueba».

## 3. Ключ API

Developers → **API keys** → Secret key (`sk_test_…`). Это `STRIPE_SECRET_KEY`.

Ключ даёт полный доступ к аккаунту: храните только в Environment Dokploy, не в git и не в чатах.

## 4. Вебхук

Developers → **Webhooks** (в новом интерфейсе — Workbench → Event destinations) → Add endpoint.

- URL: `https://api.paf-paf.app/platform/billing/webhooks/stripe`
- Events (выберите эти восемь):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`
  - `customer.subscription.resumed`
  - `invoice.paid`
  - `invoice.payment_failed`
- После создания откройте endpoint → **Signing secret** (`whsec_…`). Это `STRIPE_WEBHOOK_SECRET`.

## 5. Настройки Billing в Stripe

1. **Customer portal** (Settings → Billing → Customer portal) — включить:
   - обновление способа оплаты;
   - отмена подписки — «в конце периода»;
   - смена тарифа: добавьте продукты Barrio, Club, Cadena;
   - история счетов;
   - название бизнеса, ссылки на условия и политику конфиденциальности.
2. **Subscriptions and emails** (Settings → Billing → Subscriptions and emails):
   - Smart Retries: например, 4 попытки за 2 недели;
   - когда попытки кончились — **Cancel the subscription**;
   - письма клиенту: о неудачной оплате, о скором продлении, квитанции об оплате.
3. **Branding** (Settings → Branding): логотип и цвета PafPaf — их видно на странице оплаты и в письмах.

## 6. IVA (по желанию, можно позже)

Цены тарифов — без IVA. Пока Stripe Tax выключен, клуб платит ровно цену тарифа, и IVA вы платите из неё.

Чтобы Stripe добавлял IVA 21% сверху и собирал NIF/CIF клиента:

1. Settings → **Tax**: включите Stripe Tax, укажите адрес бизнеса и регистрацию в Испании.
2. В Dokploy поставьте `STRIPE_AUTOMATIC_TAX=true`.

Тогда в оплате появятся адрес и NIF/CIF, а сумма — с IVA. Требования Verifactu к facturas обсудите с гестором
(TASK-517).

## 7. Окружение и деплой

Dokploy → проект PafPaf → Environment, добавить:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_AUTOMATIC_TAX=false
BILLING_TRIAL_DAYS=365
BILLING_GRACE_DAYS=7
```

Затем **Deploy**. API применит миграцию `20261011120000_billing_stripe`: тарифу `trial` проставится «скрытый»,
всем клубам — бесплатный год от даты деплоя.

## 8. Тарифы в админке

`https://admin.paf-paf.app` → **Тарифы** → Новый тариф.

- `prueba-month`: id цены «PafPaf Prueba», **публичный — выключить**.
- `barrio-month` … `cadena-year`: id соответствующих цен, публичные.

Сумма, валюта и период подтянутся из Stripe. Если ключ не задан, админка ответит ошибкой «STRIPE_SECRET_KEY is not set».

Без экранов админки то же самое — запросом с токеном платформенного админа:

```bash
curl -X POST https://api.paf-paf.app/platform/admin/billing/plans \
  -H "Authorization: Bearer <токен из POST /platform/auth/login>" \
  -H "Content-Type: application/json" \
  -d '{"code":"prueba-month","stripePriceId":"price_...","isPublic":false}'
```

Через 5 минут сайт начнёт показывать цены из API (каталог кэшируется). Коды должны совпадать с кодами в Payload
(BILLING.md, «Где хранится что»).

## 9. Проверка оплаты (тестовый режим)

1. Войдите в CRM владельцем клуба и откройте
   `https://crm.paf-paf.app/es/<адрес-клуба>/crm/settings/billing?plan=prueba-month`.
2. «Pagar con tarjeta» у тарифа Prueba → страница Stripe.
3. Карта `4242 4242 4242 4242`, любая будущая дата, любой CVC, любой индекс.
4. Stripe вернёт на страницу «Suscripción»: через несколько секунд статус «Activa», «Se renueva el …».
5. Проверить:
   - Stripe → Customers: клиент с email владельца и подпиской 5 €/мес;
   - Stripe → Webhooks → endpoint: события доставлены со статусом 200;
   - админка → Клубы: у клуба тариф Prueba, «Stripe», «оплачено до …»;
   - кнопка «Tarjeta, plan y facturas» открывает кабинет Stripe.

Другие тестовые карты:

| Карта | Что будет |
|---|---|
| `4000 0025 0000 3155` | Потребует подтверждение 3-D Secure |
| `4000 0000 0000 9995` | Отказ: недостаточно средств |
| `4000 0000 0000 0341` | Карта привяжется, но следующие списания будут падать — для проверки неоплаты |

Неоплату при продлении удобно проверять через [Test clocks](https://docs.stripe.com/billing/testing/test-clocks):
клиент на тестовых часах, перемотка на месяц вперёд → `invoice.payment_failed` → у клуба «Problema con el pago»,
CRM работает ещё 7 дней, потом закрывается (страница «Suscripción» остаётся открытой).

## 10. Боевой режим

1. Дождитесь активации аккаунта (раздел 1).
2. Переключитесь из тестового режима в боевой. Продукты и цены создайте заново (или «Copy to live mode»):
   **id цен в боевом режиме другие**.
3. Боевой ключ `sk_live_…` (раздел 3) и **новый** вебхук на тот же URL — у него свой `whsec_…` (раздел 4).
   Повторите настройки раздела 5 — они у режимов раздельные.
4. В Dokploy замените `STRIPE_SECRET_KEY` и `STRIPE_WEBHOOK_SECRET`, Deploy.
5. В админке у каждого тарифа замените id цены на боевой (Тарифы → изменить).
6. Клубы, которые платили в тестовом режиме, привязаны к тестовым подпискам. Верните им бесплатный период:
   админка → Клубы → «Конец триала».
7. Проверьте настоящей картой на тарифе Prueba за 5 € и при желании верните деньги в Stripe (Payments → Refund).

## Локальная разработка

```bash
# Stripe CLI: https://docs.stripe.com/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/platform/billing/webhooks/stripe
# выведет whsec_… — его в apps/api/.env как STRIPE_WEBHOOK_SECRET, рядом STRIPE_SECRET_KEY=sk_test_…
```

`stripe trigger …` создаёт объекты, не привязанные к клубам, — API их пропустит. Проверяйте через CRM, как в разделе 9.
