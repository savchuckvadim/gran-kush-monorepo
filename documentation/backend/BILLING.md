# Биллинг PafPaf: подписка клуба

Как клуб платит за CRM, где хранятся тарифы и статусы, что происходит при неоплате.
Подключение Stripe по шагам — [STRIPE_SETUP.md](STRIPE_SETUP.md).

## Кто принимает деньги

- **Stripe.** Карту клуб вводит на странице Stripe (Checkout), не у нас: мы не видим и не храним
  данные карт. Деньги попадают на баланс Stripe, оттуда — выплатами на IBAN владельца аккаунта Stripe.
- **Автосписание.** После первой оплаты Stripe сам списывает деньги каждый месяц или год. Неудачные
  списания он повторяет (Smart Retries) и шлёт клиенту письма.
- **Кабинет клиента.** Карту, тариф, отмену и счета клуб меняет в Stripe Customer Portal — кнопка
  «Tarjeta, plan y facturas» на странице «Suscripción» в CRM.
- **CMS (Payload, сайт) к оплате не причастна.** Сайт показывает тарифы и ведёт на регистрацию в CRM.

## Где хранится что

| Что | Где | Кто меняет |
|---|---|---|
| Цена, валюта, период тарифа | Stripe Price. Копия — в `billing_plans` (API) | Цены — в Stripe; тариф с id цены — в админке |
| Тексты тарифа на сайте (название, «для кого», список возможностей) | Payload, коллекция `plans` | Редактор сайта |
| Связь сайт ↔ API | Код тарифа: `plans.billing.monthlyCode` / `yearlyCode` в Payload = `billing_plans.code` | — |
| Подписка клуба: тариф, статус, сроки | `portal_subscriptions` (API) | Вебхуки Stripe, админка, крон |
| Платежи | `payments` (API) | Вебхук `invoice.paid`, ручная оплата в админке |
| Сырые события Stripe | `payment_events` (API) | Вебхук |

База сайта (Payload) и база CRM разные и друг другу не мешают. Сайт читает цены из
`GET /platform/billing/plans` по коду тарифа (`BILLING_API_URL`). Если API недоступен или тарифа с таким кодом нет,
сайт показывает запасную цену из Payload (`fallbackMonthly` / `fallbackYearly`). Поэтому коды в админке и в
Payload должны совпадать: `calada-month`, `calada-year`, `club-month`, `club-year`, `cadena-month`, `cadena-year`.

## Тарифы

| Код | Назначение | Публичный | Цена |
|---|---|---|---|
| `trial` | Бесплатный период: новые клубы, разработка | нет | 0 |
| `prueba-month` | Проверка оплаты настоящей картой | нет, только по ссылке | 5 €/мес |
| `calada-month`, `club-month`, `cadena-month` | Боевые | да | 25 / 49 / 99 €/мес |
| `calada-year`, `club-year`, `cadena-year` | Боевые, оплата за год | да | 240 / 468 / 948 €/год |

- Тариф заводится в админке (`Тарифы`) или через `POST /platform/admin/billing/plans`. С `stripePriceId`
  сумма, валюта и период берутся из Stripe. Без него тариф годится только для ручной оплаты.
- Скрытый тариф (`isPublic=false`) не попадает на сайт. Клуб выбирает его по ссылке
  `https://crm.paf-paf.app/{locale}/{club}/crm/settings/billing?plan=prueba-month`.
- Удалить тариф нельзя: на него ссылаются подписки. Снять с продажи — `isActive=false`.
- Новая цена в Stripe не меняет уже оформленные подписки: они списывают по старой. Для новой цены лучше
  завести новый код, а старый скрыть.

## Жизненный цикл подписки

```
регистрация ──► trialing (бесплатный год, BILLING_TRIAL_DAYS)
                  │  оплата в CRM (Stripe Checkout)          ручная оплата в админке
                  ▼                                             ▼
                active (Stripe списывает сам)              active (provider = manual, до currentPeriodEnd)
                  │  списание не прошло                         │  срок вышел (крон)
                  ▼                                             ▼
                past_due + льгота BILLING_GRACE_DAYS (CRM работает, баннер «оплатите»)
                  │  льгота вышла (крон)          │ оплатили
                  ▼                               ▼
                expired → CRM отвечает 402      active
```

- Конец бесплатного периода (крон раз в час) → `past_due` с льготой 7 дней → `expired`.
- `canceled` — клуб отменил подписку в Stripe, и она закончилась.
- Портал при неоплате **не** гасится (`portals.status` не трогаем): клуб входит в CRM и попадает на страницу
  «Suscripción». Остальное закрыто гардом 402.
- Портал без подписки получает 402 (fail-closed). Подписку каждому клубу выдаёт регистрация, старым — миграция
  `20261011120000_billing_stripe`.
- Оплата во время бесплатного периода сразу завершает его: первое списание — в день оплаты.

### Статусы Stripe → наши

| Stripe | Наш | Комментарий |
|---|---|---|
| `active` | `active` | |
| `trialing` | `trialing` | Триалов Stripe мы не создаём |
| `past_due`, `unpaid` | `past_due` | Льгота начинается с первого такого события и не сдвигается |
| `canceled`, `incomplete_expired` | `canceled` | |
| `incomplete`, `paused` | без изменений | Ждём следующего события |

## Вебхук

`POST https://api.paf-paf.app/platform/billing/webhooks/stripe`

1. Подпись `Stripe-Signature` проверяется по сырому телу и `STRIPE_WEBHOOK_SECRET`. Без подписи — 401.
2. Событие пишется в `payment_events`. Повтор того же `event.id` — ответ 200 `duplicate` без действий.
3. На каждое событие о подписке API **читает актуальную подписку из Stripe**, а не собирает состояние из тела
   события. Stripe не гарантирует порядок доставки, и старое событие иначе откатило бы статус.
4. `invoice.paid` пишет платёж по id счёта — второй раз тот же счёт не запишется.
5. Ошибка обработки → 5xx, и Stripe повторит доставку.

| Событие | Что делает |
|---|---|
| `checkout.session.completed` | Привязывает клиента и подписку Stripe к клубу (`client_reference_id` = id портала) |
| `customer.subscription.created` / `updated` / `deleted` / `paused` / `resumed` | Статус, тариф по id цены, период, отмена в конце периода |
| `invoice.paid` | Платёж в `payments` + синхронизация подписки |
| `invoice.payment_failed` | Синхронизация подписки (`past_due`) |

## API

| Маршрут | Кто | Что |
|---|---|---|
| `GET /platform/billing/plans` | все | Публичный каталог для сайта (без скрытых тарифов) |
| `GET /crm/billing?plan=` | owner/admin клуба | Подписка и тарифы для выбора; открыт и при 402 |
| `POST /crm/billing/checkout` | owner/admin | Адрес Stripe Checkout для тарифа |
| `POST /crm/billing/manage` | owner/admin | Адрес Stripe Customer Portal |
| `GET/POST/PATCH /platform/admin/billing/plans` | админ платформы | Тарифы |
| `GET /platform/admin/billing/subscriptions` | админ платформы | Клубы и подписки |
| `POST /platform/admin/billing/subscriptions/:portalId/manual-payments` | админ платформы | Оплата вне Stripe: `{ months, amount?, planCode? }` |
| `PATCH /platform/admin/billing/subscriptions/:portalId/trial` | админ платформы | Новый конец бесплатного периода |
| `POST /platform/billing/webhooks/stripe` | Stripe | Вебхук |

Клубу, который платит через Stripe, ручная оплата и смена триала недоступны (409): им управляет Stripe.

## Переменные окружения (API)

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `STRIPE_SECRET_KEY` | — | Ключ API Stripe (`sk_test_…` / `sk_live_…`). Без него онлайн-оплата выключена |
| `STRIPE_WEBHOOK_SECRET` | — | Секрет подписи вебхука (`whsec_…`). Без него вебхук отвечает 401 |
| `STRIPE_AUTOMATIC_TAX` | `false` | `true` — Stripe Tax: IVA сверху цены, NIF/CIF и адрес в оплате |
| `BILLING_TRIAL_DAYS` | `365` | Бесплатный период нового клуба |
| `BILLING_GRACE_DAYS` | `7` | Льгота после неоплаты или конца бесплатного периода |
| `CRM_FRONTEND_URL` | — | Адрес CRM: туда Stripe возвращает после оплаты |

## Код

- `apps/api/src/modules/billing` — модуль: `domain/billing-provider.interface.ts` (порт провайдера),
  `infrastructure/stripe/*` (Stripe), `application/services/*` (оплата из CRM, синхронизация, админка).
- `apps/api/src/modules/cron/services/billing-cron.service.ts` — сроки.
- `apps/api/src/common/guards/portal-crm-subscription.guard.ts` — 402.
- `apps/crm/modules/features/billing` — страница «Suscripción».
- Тесты: `apps/api/test/billing.e2e-spec.ts` (весь путь с подписанными вебхуками),
  `apps/api/src/modules/billing/__tests__`.

## Не сделано

- Счета-фактуры по требованиям Verifactu и NIF в facturas — TASK-517. Stripe выставляет свои invoices;
  для испанской отчётности нужна проверка гестора.
- Запрет приглашать сотрудников без оплаты или подтверждённой почты.
- Тариф «для нескольких клубов» (TASK-508).
