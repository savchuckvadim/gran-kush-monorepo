# PafPaf: план до первого клиента

Дата анализа: 2026-10-09. Ветка `main`, HEAD `f0194ff`.
Источники: код (аудит по четырём направлениям с выборочной перепроверкой), документация,
страница проекта в Notion.

Смежное: [rebranding-and-positioning](rebranding-and-positioning.md),
[security-audit](security-audit.md), [scaling-roadmap](scaling-roadmap.md),
[site/PRODUCT_SITES](../site/PRODUCT_SITES.md), [crm/THEMES](../crm/THEMES.md),
[infra/dokploy/README](../../infra/dokploy/README.md).

---

## Контекст

- От бренда Gran Kush отказались окончательно. Продукт называется **PafPaf**: облачная CRM для клубов по подписке плюс
  сайт `paf-paf.app`. **Nagual** остаётся запасной концепцией и в деплой не входит.
- На Dokploy развёрнуты `paf-paf.app` (site), `crm.`, `api.` и `admin.`. Кабинет участника `club.`
  поднимается только с `COMPOSE_PROFILES=club`.
- Цель в Notion: довести MVP до запуска к ~16.10.2026, затем продать первому знакомому клубу
  офлайн и только потом продавать через интернет.

## Легенда

- `[ ]` — не начато, `[~]` — частично, `[x]` — готово.
- **P0** — без этого CRM нельзя отдать первому клиенту.
- **P1** — нужно, чтобы продавать через сайт.
- **P2** — после запуска.

---

## Где мы сейчас

| Направление | Состояние |
|---|---|
| Сайт | Работает. Кнопки тарифов и «Войти» ведут в CRM (ветка `feat/site-to-crm-entry`). Кнопку «Probar gratis» на проде нужно поправить в CMS на `crm:register`. SEO, иконки и вход с телефона — TASK-534 (`feat/site-seo`) |
| Auth в CRM | Регистрация с тарифом и адресом клуба, вход без адреса клуба с выбором клуба (`feat/site-to-crm-entry`). Refresh не работал вовсе — починен там же. Восстановления пароля в CRM ещё нет: ссылка ведёт на 404 |
| Оплата | Есть схема, журнал вебхуков, гейт 402 и публичный каталог тарифов. Нет провайдера, тарифов в БД (там только `trial`), окончания триала и кнопки «Оплатить» |
| Тема CRM | PafPaf — тема по умолчанию (`feat/crm-pafpaf-default`). Clásico и порядок тем не тронуты |
| Бренд | В письмах «April», в CRM иконка конопли, в i18n клубные тексты Gran Kush. Остатки старых брендов — в 67 файлах |
| Тесты | Сценарии auth и биллинга в e2e не покрыты, фронтовых тестов нет |
| Невлитые ветки | `fix/exception-filter-contract` и `fix/cron-row-locking` влиты в `chore/merge-pending-fixes` (TASK-550). Ветка ждёт пуша и слияния в main |
| Документация | CLAUDE.md и половина доков описывают Gran Kush и старую модель auth. HISTORY обрывается на 2026-08-26 |

---

## Порядок работ

Ветки 1–6 — минимум для офлайн-продажи, 7–9 — для продаж через сайт. Тесты пишутся вместе
с каждой веткой, в ветке 9 — только сквозные сценарии.

1. `chore/merge-pending-fixes` — TASK-550
2. `feat/site-to-crm-entry` — TASK-501…504
3. `feat/crm-email-auth` — TASK-505…507: восстановление пароля, подтверждение почты
4. `feat/billing-plans-trial` — TASK-510…514
5. `feat/crm-pafpaf-default` — TASK-521
6. `chore/brand-pafpaf` — TASK-530…534
7. `feat/another-club` — TASK-508
8. `feat/billing-stripe` — TASK-515…517
9. `test/auth-billing-flow` — TASK-540…543

Документация (TASK-56x) и Notion (TASK-57x) идут параллельно.

---

## Решения (Вадим, 2026-10-09)

1. **Провайдер оплаты — Stripe.** PafPaf продаёт только ПО, а дальше пойдёт в другие ниши: тату-салоны и т.п.
   (см. «Дальше»). Первым клиентам подписку продлеваем вручную в админке (TASK-514). Stripe
   (TASK-515…517) подключаем параллельно: аккаунт подаём заранее и описываем продукт как SaaS для
   клубов и салонов.
2. **Оплата живёт только в API.** У Payload есть плагины для Stripe (`plugin-stripe`, e-commerce), но они
   нужны для магазина на самом сайте с товарами и заказами в базе Payload. Подписка клуба — сущность
   основной БД: от неё зависят гард 402 и CRM. Сайт только показывает тарифы из
   `GET /platform/billing/plans` и ведёт в CRM.
3. **Тарифы.** Все три — Calada 25, Club 49, Cadena 99 € в месяц (за год 240 / 468 / 948 €) — заводятся
   через **админ-API и экран в `apps/admin`**, а не зашиваются миграцией (TASK-510). Онлайн-оплату
   начинаем с одного месячного тарифа.
4. **Триал — долгий бесплатный период.** Так и продаём: «первые N лет бесплатно» (обсуждались 1 и 3 года).
   Длительность настраивается, по порталу её можно менять из админки (TASK-511).
5. **Email подтверждаем.** В CRM нужны подтверждение почты, восстановление пароля и связанные с ними сценарии
   (TASK-505, TASK-506).
6. **Существующий email при регистрации нового клуба.** Вместо 409 показываем «У вас уже есть клуб.
   Завести ещё один?»: вход, затем создание клуба изнутри CRM и предложение тарифа для нескольких
   клубов (рабочее название «Пабло») — TASK-508.
7. **Репозиторий** `gran-kush-monorepo` переименуем потом, отдельной задачей (TASK-535).

---

## A. Вход с сайта и auth — P0

### TASK-501: кнопки сайта ведут в CRM `[x]` — `feat/site-to-crm-entry`

- `apps/site/modules/sites/pafpaf/blocks/pricing.tsx:191`: заменить `href="#"` на
  `${CRM_URL}/{locale}/auth/register?plan=<code>`.
- «Войти» (`frame.tsx:59,79`) должна вести на `${CRM_URL}/{locale}/auth/login` с локалью сайта. Сейчас
  она открывает корень CRM, а это `/en/...`, хотя у сайта по умолчанию `es`.
- «Probar gratis» в сиде Payload (`payload/seed/content.ts:26,94`) должна вести на регистрацию, а не на `/precios`.
  На проде сид повторно не зальётся, поэтому контент правится в CMS руками.
- Все ссылки строить одним хелпером рядом с `CRM_URL` в `modules/shared/config/site.ts`.

### TASK-502: регистрация клуба принимает тариф `[x]` — `feat/site-to-crm-entry`

- Добавить `RegisterPortalDto.planCode?` с проверкой по активным тарифам. Подписка `trialing` создаётся на
  выбранном тарифе, а не на `trial` (`provision-portal-from-templates.service.ts:228-261`).
- Форма CRM (`modules/features/auth/register/registration-form.tsx`) читает `?plan` и показывает выбранный тариф.
- Правило пароля на фронте сделать как в API: заглавная, строчная и цифра (`register-portal.dto.ts:36`).
  Сейчас пользователь узнаёт о нём из 400 после отправки формы.
- Slug: `makePortalSlug` (стр. 44–52) вырезает всё, кроме `a-z0-9-`. Из «Клуб» получается пустой slug,
  «Ñandú» превращается в «and». Нужны транслитерация и отдельное редактируемое поле с проверкой занятости.
- Перевести тексты форм на i18n (`//todo: i18n` в `useLoginSchema.ts:9`).

### TASK-503: логин без ручного slug и выбор клуба `[x]` — `feat/site-to-crm-entry`

- `/{locale}/auth/login` не спрашивает slug. После логина вызывать `GET /crm/my-portals`: если клуб один,
  сразу редирект, если несколько — экран выбора.
- В ответе логина уже есть `portals[{portalId, role}]`. Если добавить туда slug, лишний запрос не понадобится.
- Учитывать `?from=`, который ставит `proxy.ts`.
- ~~Убрать `domain` из тела логина~~ — уже сделано в `fix/exception-filter-contract`, приходит вместе с TASK-550.
- Ошибки: сейчас любая из них показывается как «Club is required or not found», даже неверный пароль.
- Уже авторизованного пользователя с `/{locale}/auth/login` сразу переводить в клуб.

### TASK-504: петля редиректов при протухшей сессии `[x]` — `feat/site-to-crm-entry`

- Если `POST /crm/auth/refresh` падает, куки не очищаются (`employee-auth.controller.ts:80-96`). При этом
  `proxy.ts:43-58` пускает в `/crm` по одному наличию refresh-куки.
- Сценарий: после сброса пароля все refresh отозваны → `/me` даёт 401 → логин → proxy видит куку →
  `/crm` → и снова по кругу.
- Сначала воспроизвести: петля выведена из кода, руками не проверялась.
- ~~Правка: чистить куки при неудачном refresh~~ — отказались. Если в двух вкладках одновременно
  истёк access-токен, вторая вкладка проигрывает гонку ротации и стёрла бы свежие куки первой.
- Сделано: proxy уводит с `auth/*` только при живой access-куке, страница входа сама узнаёт сессию,
  которую можно восстановить через refresh.
- По дороге найдено: **refresh не работал вовсе.** Ротация вставляла вторую строку для того же
  устройства и падала на `@@unique(principalType, userId, deviceId)`. Ещё два входа за одну секунду
  давали одинаковый JWT. Исправлено так: upsert строки устройства, ротация compare-and-set, `jti`.
  e2e — `test/auth-sessions.e2e-spec.ts`.

### TASK-505: восстановление пароля в CRM `[x]` — `feat/crm-email-auth`

- В CRM нет страниц `forgot-password` и `reset-password`, поэтому ссылка из `login-form.tsx:78` ведёт на 404.
- `requestPasswordReset` всегда отправляет тип `site` (`email-verification.service.ts:117`). Сотрудник CRM
  получает ссылку на `club.`, который в Dokploy выключен. Нужно передавать `crm`.
- Шаблон письма ведёт на `${baseUrl}/auth/recovery/${token}` (`reset-password.template.tsx:38`). Такого роута
  нет ни в CRM, ни в web: web ждёт `/{locale}/auth/reset-password?token=`. Значит, в кабинете участника
  сброс пароля тоже сломан.
- Сделано: `POST /crm/auth/password/reset` и `/reset/confirm`, страницы `/{locale}/auth/forgot-password` и
  `/{locale}/auth/reset-password?token=` в CRM. Письмо ведёт на `{CRM|кабинет}/{locale}/auth/reset-password?token=`,
  поэтому заодно заработал сброс в кабинете участника. Язык письма — из `locale` запроса, тексты на es/ru/en
  вместо русского «TeaCoder». Сброс подтверждает email: ссылка из письма доказывает владение адресом.

### TASK-506: подтверждение email владельца и сотрудников `[x]` — `feat/crm-email-auth`

- Сейчас регистрация ставит `emailConfirmed: true` (`portal-registration.service.ts:85`), а `confirm-email`
  в CRM — заглушка на `setTimeout` (`app/[locale]/auth/confirm-email/page.tsx:28`).
- Нужно: регистрация создаёт неподтверждённый email и отправляет письмо со ссылкой, плюс настоящая страница
  подтверждения и повторная отправка.
- Предложение: автологин после регистрации оставить, а в CRM показывать баннер «подтвердите почту».
  Без подтверждения не работают оплата и приглашения сотрудников.
- Сделано: регистрация клуба создаёт неподтверждённый email и шлёт письмо на языке формы; `/{locale}/auth/confirm/{token}`
  в CRM, баннер «Подтвердите почту» с повторной отправкой (`POST /crm/auth/confirm-email/resend`, только с сессией),
  `emailConfirmed` в `GET /crm/auth/me`. Заглушка `auth/confirm-email` удалена. e2e — `test/crm-email-auth.e2e-spec.ts`.
- Не сделано: блокировка приглашений сотрудников без подтверждённой почты (оплаты пока нет) — отдельно, если нужно.

### TASK-508: «У вас уже есть клуб — завести ещё один?» `[ ]`

- Сейчас на занятый email `POST /platform/portals/register` отвечает 409
  (`portal-registration.service.ts:56,64`).
- Форма регистрации на 409 показывает «У вас уже есть клуб. Завести ещё один?» и ведёт на вход с возвратом к
  созданию клуба.
- API: `POST /crm/portals` — авторизованный пользователь создаёт ещё один портал и становится его
  владельцем. Модель мульти-порталов это уже позволяет: `Employee(userId, portalId)`.
- CRM: пункт «+ новый клуб» в переключателе порталов. Предлагать тариф для нескольких клубов
  (рабочее название «Пабло»; уточнить, это переименованный Cadena или новый тариф).

### TASK-507: прод-настройки auth `[~]`

- `JWT_ACCESS_TOKEN_EXPIRES_IN` в Dokploy по умолчанию `1d` (`infra/dokploy/docker-compose.yml:93`), а
  access-токен не отзывается. Вернуть `15m`, но только после выкладки починки refresh (TASK-504).
  До неё короткий access означает вылет из CRM каждые 15 минут.
- Сделано в `feat/crm-email-auth`: дефолт в compose — `15m`. Проверить, что в Environment Dokploy не задано `1d`.
- P2: эндпоинт «выйти везде» (`logoutAll` в сервисе есть, роута нет).
- P2: обнаружение повторного использования refresh и хранение хэша вместо самого токена.
- ~~P2: гонка между `findActive` и `revokeById`~~ — закрыта ротацией compare-and-set (TASK-504).

---

## B. Оплата: ежемесячная подписка в евро — P0/P1

**Сделано 2026-10-11** (`feat/billing-stripe`). Устройство — [backend/BILLING.md](../backend/BILLING.md), подключение Stripe по шагам —
[backend/STRIPE_SETUP.md](../backend/STRIPE_SETUP.md). Коротко:

- оплата — Stripe Checkout, автосписание и повторы — Stripe, карта и отмена — Stripe Customer Portal;
- вебхук `/platform/billing/webhooks/stripe`: подпись по сырому телу, на каждое событие читается актуальная подписка;
- тарифы в админке по id цены Stripe, скрытые тарифы по ссылке `?plan=`;
- бесплатный год при регистрации, крон: конец триала или ручного срока → past_due + 7 дней → expired;
  портал не гасится, CRM закрывает гард 402, страница «Suscripción» открыта всегда;
- ручная оплата и конец триала — в админке (`platform/admin/billing/*`, экраны в `apps/admin`);
- `STRIPE_AUTOMATIC_TAX=true` включает IVA через Stripe Tax; facturas по Verifactu — не сделано.

Решения Вадима 2026-10-11: бесплатный период по умолчанию — **1 год**; провайдер — **Stripe**; три вида тарифов —
бесплатный `trial` (разработка, первые клубы), тестовый `prueba-month` за 5 €/мес для проверки оплаты настоящей
картой, боевые помесячные в евро.

Было:

Сейчас:

- триал бессрочный: `currentPeriodEnd` не заполняется;
- гард пропускает портал без подписки (fail-open);
- статусы `active` и `past_due` никто не выставляет, поэтому крон истечения никогда не срабатывает.

А если бы сработал, портал стал бы `suspended` и отдавал 404 даже на `portal/info`. Экран оплаты был бы недоступен.

### TASK-510: тарифы через админ-API `[x]` P0 — `feat/billing-stripe`

- Платформенный CRUD: `GET/POST/PATCH /platform/admin/billing/plans` и архивирование через `isActive=false`
  вместо удаления, потому что на тариф ссылаются подписки. Доступ только для платформенного админа.
- Экран «Тарифы» в `apps/admin`: код, название, цена, валюта, интервал, `features_json`, активен или нет.
- Три тарифа (Calada / Club / Cadena, месяц и год) завести через этот экран. Набросок SQL в
  `site/PRODUCT_SITES.md` («Тарифы в API») остаётся справкой по кодам и ценам.
- Убрать `trial` из публичного `GET /platform/billing/plans`: сейчас он попадает в выдачу.

### TASK-511: долгий бесплатный период `[x]` P0 — `feat/billing-stripe`

- Добавить поля `trialEndsAt` и `cancelAtPeriodEnd`. `trialEndsAt` выставлять при регистрации:
  регистрация + настраиваемая длительность. Это env или настройка платформы, по умолчанию N лет — решение №4.
- В админке по каждому порталу видно `trialEndsAt` и его можно менять: продлить, сократить, перевести на тариф.
- Крон переводит `trialing` с истёкшим `trialEndsAt` в `past_due` с `graceEndsAt`.
- Гард: портал без подписки получает 402, то есть fail-closed (`common/guards/portal-crm-subscription.guard.ts:33-35`).
- На сайте обещание «первые N лет бесплатно» — контент в Payload, цифра должна совпадать с настройкой.

### TASK-512: портал с истёкшей подпиской не должен пропадать `[x]` P0 — `feat/billing-stripe`

- Крон ставит порталу `suspended` (`cron/services/billing-cron.service.ts:33`), а `ensureActive`
  (`portal-resolution.service.ts:69`) отвечает на это 404 «Portal is not available». Это касается
  middleware, `portal/info` и логина: клиент не видит экран оплаты и не может продлить подписку.
- Предложение: при истечении подписки `Portal.status` не трогать, доступ закрывает гард через 402.
  `suspended` оставить для ручной блокировки со стороны платформы.

### TASK-513: страница «Подписка» в CRM `[x]` P0 — `feat/billing-stripe`

- `GET /crm/billing`: текущий тариф, статус и даты. Доступ только owner/admin, гейт 402 не применяется.
- В CRM — раздел в настройках и кнопка в `SubscriptionGate`
  (`modules/widgets/subscription-gate/subscription-gate.tsx`). Пока провайдера нет, кнопка показывает
  «Свяжитесь с нами» и реквизиты.

### TASK-514: ручное продление в админке `[x]` P0 — `feat/billing-stripe`

- В `apps/admin` сделать список порталов с подписками (`GET /platform/portals` уже есть, только на чтение)
  и действие «Отметить оплату». Оно создаёт `Payment` с `provider=manual`, ставит `active` и новый
  `currentPeriodEnd`.
- Проводить через `PaymentsService.recordProviderPayment`: он идемпотентен по `(provider, externalId)`.

### TASK-515: Stripe `[x]` P1 — `feat/billing-stripe`

- Аккаунт Stripe подать заранее: проверка бизнеса идёт дольше, чем интеграция.
- Адаптер `PaymentWebhookVerifier` для Stripe (`stripe.webhooks.constructEvent`), клиент Stripe API, переменные окружения.
- Сырое тело для `/platform/billing/webhooks/:provider`. Сейчас body-parser разбирает JSON на всех
  маршрутах без `verify` (`common/config/body-parser/body-parser.config.ts:26-32`).
- Контроллер вебхука, который вызывает `PaymentEventsService.ingest`. Журнал событий и идемпотентность уже есть.
- Поля провайдера:
  - в `PortalSubscription` — id клиента и подписки;
  - в `BillingPlan` — id цены;
  - в `Payment` — `subscriptionId` и оплаченный период.
- Чек-лист перед подключением: `backend/IDEMPOTENCY_AND_SCALING.md` §4.

### TASK-516: checkout и машина состояний `[x]` P1 — `feat/billing-stripe`

- `POST /crm/billing/checkout` и `POST /crm/billing/portal`: только для owner, без гейта.
- Обработчики событий с compare-and-set по статусу:
  - оплата прошла → `active` и новый период;
  - оплата не прошла → `past_due` и `graceEndsAt`;
  - отмена → `canceled` в конце периода.

### TASK-517: счета и IVA `[~]` P1

- IVA 21% и reverse charge для B2B внутри ЕС.
- Сбор NIF/CIF и адреса клиента.
- Нумерованные facturas по требованиям Verifactu.
- Большую часть этого снимает MoR-провайдер.

---

## C. Тема CRM — P0

Решение Вадима (2026-10-09): скин `pafpaf` уже есть, его не переделываем, а только делаем темой по
умолчанию. Clásico остаётся как есть, порядок тем в списке не меняется. TASK-520 снята.

### ~~TASK-520: переделать скин `pafpaf` под «жидкий» дизайн сайта~~ — снята

- Сейчас скин `pafpaf` (`packages/ui/src/styles/skins.css:120-166`) сделан по прототипу «белый минимализм»,
  первым идёт светлый режим.
- Источник токенов — `apps/site/modules/sites/pafpaf/liquid.css`:
  - тёмный режим: фон `#000`, текст `#f5f5f7`, линии `rgba(255,255,255,.14)`;
  - акценты `#8f7bff` / `#ff6fae` / `#ffbf5a` и aurora-градиент из них;
  - ok `#4be08a`, bad `#ff5d6c`;
  - светлый режим — `liquid.css:26-43`.
- Режимы `DARK_FIRST` (`apps/crm/modules/shared/config/skins.ts`). Заголовки weight 600 с трекингом около
  -0.045em, крупнее радиусы карточек, кнопки-пилюли.
- Эффекты:
  - стекло (`skins.css:657-684`);
  - aurora на основной кнопке;
  - перетекающая рамка, обещанная в описании темы: `--flow-stops` объявлен, но не используется.
- Дым — по желанию, отдельным слоем в `SkinBackdrop`. В эко-режиме выключается.

### TASK-521: PafPaf — тема по умолчанию `[x]` — `feat/crm-pafpaf-default`

- Clásico и порядок тем в списке не трогать.
- Сменить `DEFAULT_SKIN = "clasico"` (`skins.ts:38`) на `pafpaf`.
- Сейчас тема по умолчанию рисуется без атрибута. Нужны SSR-атрибут `data-skin` на `<html>`
  (`app/layout.tsx:15`) и правки boot-скрипта и `skin-document.ts`. `clasico` получит явный атрибут,
  блок стилей под него уже есть.
- У Onest убрать `preload:false` (`app/fonts.ts:35-40`), иначе текст будет мигать при загрузке.
- `:root` в `packages/ui/src/styles/globals.css` не трогать: это заденет `apps/web`.

### TASK-522: логотип и иконки `[~]`

- Логотип сайта существует только как inline SVG (`apps/site/modules/sites/pafpaf/ui/svg-defs.tsx:88-102`, надпись «paf paf»).
  Вынести его в общий компонент в `packages/ui` и экспортировать favicon, apple-touch и og.
- Что сейчас в CRM:
  - в сайдбаре иконка lucide `Cannabis` и подпись «CRM» (`shared/ui/Sidebar/Sidebar.tsx:56-63`);
  - `app/favicon.ico` старый;
  - `metadata` и `title` не заданы.
- ~~У сайта фавикона тоже нет.~~ Фавикон, `icon.svg` и apple-icon сайта сделаны в TASK-534.
- Сделано в CRM (`feat/crm-shell-mobile`): знак PafPaf (`shared/ui/Brand`) вместо `Cannabis` в сайдбаре и мобильной
  шапке, подпись PafPaf. Общий компонент в `packages/ui`, favicon и og — ещё нет.

### TASK-524: мобильная шапка CRM и бургер под темы `[x]` — `feat/crm-shell-mobile`

- На телефоне в шапке только бургер и знак PafPaf. Клуб, язык, тема, оформление и профиль переехали в выезжающее
  меню; оно открывается под шапкой, поэтому бургер остаётся сверху и превращается в крест.
- Бургер анимируется по-своему в каждой теме (`packages/ui/src/styles/burger.css`): дымный след и «пуф» у PafPaf,
  вихрь у Nagual, радуга с искрой у Unicornio, спутник у Galaxia, пиксели у Noventa и т.д. Эко-режим и
  `prefers-reduced-motion` анимацию выключают.
- Профиль в шапке — кружок с инициалом и email вместо кнопки с кроликом. Иконки разделов: люди, коробка, сумка,
  календарь, кошелёк, сотрудники вместо кота, хмеля, геймпада и копилки.

### TASK-523: долги темизации `[ ]` P1

- Около 83 цветов палитры Tailwind в 14 файлах обходят токены тем. Пример — бейджи ролей в `employees/page.tsx:21-25`.
- Классу `bg-card-background` (`crm-shell.tsx:96`) не соответствует ни один токен. `--destructive-foreground`
  (`globals.css:102`) нигде не задан.
- В шапке: кнопка профиля с иконкой `Rabbit` и жёстко заданными цветами (`crm-shell.tsx:82`), закомментированный блок (`:63-68`).
- Пустые экраны: дашборда нет (`crm/page.tsx` сразу редиректит на участников), профиль — заглушка.

---

## D. Бренд — P0 для того, что видит клиент, P1 для остального

### TASK-530: письма без «April» `[ ]` P0

- Где встречается:
  - `common/config/mail/mailer.config.ts:20` — `"April Team"`;
  - `modules/mail/consts/mail.constants.ts:9` — `manager@april-app.ru`;
  - `consts/portal-registration-email.ts`, `consts/verifiaction-email.ts`;
  - шаблоны `modules/mail/templates/*.tsx`.
- Имя отправителя и подписи брать из TASK-531, адрес — из env (`SMTP_FROM`).

### TASK-531: единый источник бренда `[ ]` P0

- Это TASK-401. Пакет `packages/brand`: название, домен, e-mail поддержки, юрлицо, вариант pafpaf/nagual.
  Читают его api, crm, admin и site. Сейчас такие константы есть только у сайта (`apps/site/modules/shared/config/site.ts`).
- В i18n остаются только фразы с параметром `{brand}`.

### TASK-532: чистка клубных текстов Gran Kush `[x]` P0 — `chore/legacy-club-texts`

- Это TASK-402. В 38 файлах i18n: `home`, `about-us`, `contacts` (`info@grankush.com`), `common.companyName`,
  `crm.shell.brand`.
- В crm и admin эти неймспейсы не нужны: удалить вместе с их типами в `types.ts`. В `apps/web` заменить
  тексты, когда будем включать `club.`.
- Примеры «OG Kush» в Swagger (`product.dto.ts`, `order.dto.ts`) заменить на нейтральные: они видны в публичной схеме.
- 2026-10-11, ветка `chore/legacy-club-texts`. crm и admin: удалены `home`, `about-us`, `contacts` во всех языках
  (их и не загружал `i18n.ts`), ключи `common.companyName/companyTagline`, `navigation.about/contacts`, `crm.shell.brand`
  в admin, `ROUTES.ABOUT/CONTACTS` и эти ключи в `types.ts`; в мёртвом `Sidebar` admin иконка-лист заменена. Кабинет
  участника (`apps/web`): главная, «О нас» и «Контакты» переписаны на es/ru/en без бренда клуба — про кабинет участника
  PafPaf; `companyName` — PafPaf. В «Контактах» вместо `info@grankush.com`, телефона-заглушки и формы, которая никуда
  не отправляла, — ссылки на каталог клубов (адрес — на странице клуба из портала) и «Мои клубы». Иконка-лист в меню
  кабинета заменена. API: примеры Swagger «OG Kush», «Indica», «Классический сорт», «Без стеблей», категория «flower»,
  номер «GK-000123» заменены на нейтральные, `schema.ts` перегенерирован.
- Осталось вне задачи: корневые `README.md`, `CLAUDE.md`, `TASKS.md`, `DOCUMENTATION.md` (TASK-560/561), `APP_NAME` в
  `infra` (TASK-533), прототипы в `design/`. Поля товара `thc`, `cbd`, `strain` в схеме БД и форме CRM — это функции, не
  тексты. В `apps/web` страницы каталога клубов и профиля пишут русские строки прямо в коде, без i18n.

### TASK-536: подписи системных полей на языке интерфейса `[ ]` P1

- Поля участника и сотрудника из шаблонов (`global-templates.seed.ts`) подписаны только по-английски: «First name», «Phone» видны
  в es/ru в формах, в плитках настроек и в профиле. Добавить `labelI18n` (es/ru/en) системным полям шаблонов, перенести
  в уже созданные порталы миграцией данных и отдавать подпись на языке запроса в form-schema и списках полей.
  `labelOverride` клуба по-прежнему главнее.
- 2026-10-11, ветка `feat/content-i18n` (фаза 1): шаблоны полей участника/сотрудника и статусов участника получили
  `labelI18n` es/ru/en; API берёт язык из `Accept-Language` (`@RequestLocale()`, по умолчанию `es`) и отдаёт подписи
  через `resolveLabel` в схемах форм, фильтрах, статусах, карточках участника/сотрудника и записях; CRM и кабинет шлют
  язык из URL (`getLocale` в `configureApiClient`). Существующие клубы дозаполняются синком на старте API — без SQL
  и `RUN_SEED`. Устройство — [backend/CONTENT_I18N.md](../backend/CONTENT_I18N.md).
  Осталось (фаза 2): редактирование переводов в настройках, названия стадий и сущностей, подсказки и опции, письма.

### TASK-533: имена в инфраструктуре `[ ]` P1

- Где осталось:
  - `infra/compose/env/api.env.example` — `APP_NAME="Gran Kush API"`;
  - корневой `package.json` — `"name": "gran-kush"`;
  - `ci.yml` — `kush` / `gran_kush_test`;
  - nginx-шаблон с `el-gran-kush.ru`;
  - legacy `docker-compose.prod.yml`.
- **Не трогать:**
  - сервисы `pafpaf-*` в Dokploy: к ним привязаны домены Traefik;
  - дефолты dev-БД `kush` / `bro-crm`: смена сломает локальные тома. Менять только вместе с инструкцией по миграции.
- `IMAGE_PREFIX` по умолчанию указывает на `ghcr.io/savchuckvadim/gran-kush-monorepo` (5 раз в
  `infra/dokploy/docker-compose.yml`), см. TASK-535.

### TASK-535: переименовать репозиторий `gran-kush-monorepo` `[ ]` P2 — отдельно, позже

- Порядок:
  1. Задать `IMAGE_PREFIX` явно в Environment Dokploy.
  2. Переименовать репозиторий на GitHub.
  3. Прогнать `deploy.yml`, чтобы образы появились по новому пути в ghcr.
  4. Обновить URL репозитория в Dokploy и дефолты `IMAGE_PREFIX` в `infra/dokploy/docker-compose.yml`
     и `infra/compose/docker-compose.deploy.yml`.
  5. Обновить ссылки в доках и памяти агентов (`api.github.com/repos/savchuckvadim/gran-kush-monorepo`).
- Если пропустить первый шаг, прод молча останется на старых образах.

### TASK-534: SEO сайта `[x]` P1 — `feat/site-seo`

- Это TASK-408: `sitemap.ts`, `robots.ts` и hreflang для es/ru/en в `apps/site`. Сделано по аудиту paf-paf.app от 2026-10-11.
- `robots.txt`: всё открыто, кроме `/admin` и `/api`; строка `Sitemap:` строится от `NEXT_PUBLIC_SERVER_URL`.
- `sitemap.xml`: все страницы сайта из Payload в трёх локалях, `home` → `/{locale}`, с hreflang (плюс `x-default` → es)
  и `lastmod` из `updatedAt`. Читается из базы на запросе: в Docker-сборке базы нет.
- Иконки: `app/icon.svg` (знак из `LogoMark`, градиент встроен), `app/favicon.ico` 16/32/48 из того же SVG,
  `app/apple-icon.tsx` 180×180 на чёрном. Proxy next-intl больше не уводит `/apple-icon` в `/es/apple-icon`.
- Open Graph и Twitter в `cmsPageMetadata`: канонический `og:url`, `website`, `og:site_name`, `og:locale`
  (`es_ES`/`ru_RU`/`en_US`) с `alternateLocale`, `summary_large_image`. Картинка — `opengraph-image.tsx` 1200×630:
  чёрный фон, aurora, знак и слоган на языке страницы (`meta.tagline` в i18n). Файл лежит и в `[slug]`: страница берёт
  картинки только из своей папки.
- JSON-LD (`modules/pages/json-ld.tsx`): `Organization` (контакты — только если заполнены в `sites.contacts`, сейчас пусты),
  `WebSite`, `SoftwareApplication` с `offers` из тех же тарифов, что видит страница цен, и `FAQPage` из блока FAQ.
  JSON экранирован (`<`, `>`, `&`).
- `htmlLimitedBots` в `next.config.ts`: шире стандартного списка Next, в него попадают Googlebot, Telegram и
  любые `bot`/`crawl`/`spider`/`preview`. Для них метаданные блокирующие и всегда в `<head>`.
- Заголовки на всех ответах: HSTS (`max-age=31536000; includeSubDomains`), `nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, CSP только `frame-ancestors 'self'`. Админка Payload работает.
- `/{locale}/home` → 308 на `/{locale}`.
- 404 (`[locale]/not-found.tsx`): рамка сайта (шапка, футер) и локализованный `<title>`, статус 404 и `noindex`.
  Ограничение Next 16: при `notFound()` сервер отдаёт оболочку с `<head>`, а тело страницы дорисовывает клиент.
  Полностью серверная 404 — только через `global-not-found` (experimental) и проверку slug в proxy, отдельной задачей.
- Мобильная шапка (≤900px): в пилюле сверху теперь «Entrar» и CTA на регистрацию в CRM. Проверено на 320–390px.
  Ссылки-чипы в пилюлях центрированы по вертикали, раньше текст прилипал к верху.
- Мелочи: «Nº/№/No.» в карточке участника по локали; бейдж «Para tu club» рендерится только у рекомендуемого
  тарифа, место под него держат все карточки, поэтому заголовки не прыгают. На странице вне меню (404) капля меню скрыта.
- Hero-видео (7,4 МБ) грузится только при `min-width: 901px` и без `prefers-reduced-motion`, иначе остаётся постер.
- Руками на проде: если `sites.contacts` заполнят, они сами появятся в JSON-LD. HSTS с `includeSubDomains` требует
  HTTPS на всех поддоменах `paf-paf.app`. Sitemap отправить в Google Search Console и Яндекс Вебмастер.

---

## E. Тесты — P0, вместе с ветками A и B

### TASK-540: e2e auth `[ ]`

- `test/auth.e2e-spec.ts`:
  - register → куки → `me` → refresh (ротация: старый токен даёт 401) → logout → `me` даёт 401;
  - лимит на `/crm/auth/login`;
  - сброс пароля с отзывом сессий;
  - логин без slug и `my-portals`.

### TASK-541: e2e и unit биллинга `[ ]`

- Сквозной сценарий: регистрация с `planCode` → триал → истёк → 402 → ручная оплата → `active`.
- Крон окончания триала. Портал с истёкшей подпиской не отдаёт 404.
- Unit-тесты обработчиков вебхука — после TASK-515.

### TASK-542: unit-тесты ядра auth `[ ]` P1

- `TokenIssuer`, `MembershipGuard`, `PortalRegistrationService` и cookie-сервис сейчас тестами не покрыты.

### TASK-543: Playwright smoke `[ ]` P1

- Сценарии: сайт → «Elegir plan» → регистрация → `/{locale}/{slug}/crm`; логин; выбор клуба. Запускать в CI.
- Добавить в `ci.yml` typecheck для `apps/site`: сейчас он не запускается.

---

## F. Прод и долги безопасности — P0

### TASK-550: влить висящие ветки `[x]` — ветка `chore/merge-pending-fixes`, 2026-10-09

Итог:

- Конфликты — только `pnpm-lock.yaml` (пересобран) и `mail.module.ts`.
- При слиянии найден баг из `fix/cron-row-locking`. Детерминированные `jobId` с `:` BullMQ 5 отвергает
  («Custom Id cannot contain :»), и регистрация клуба падала бы с 500 уже после создания портала.
  Исправлено хелпером `buildJobId` в `@common/queue/job-options`.
- Лог упавшего события портала теперь показывает ошибку, а не `[object Object]`.
- Проверки: typecheck api / crm / web / admin / site чистый, unit 157/157, e2e 9 сьютов / 135 тестов.

Исходное описание:

- `fix/exception-filter-contract` (3 коммита, 2026-09-05), закрывает TASK-306/308/310:
  - `GlobalExceptionFilter` и `ValidationPipe({ forbidNonWhitelisted: true })` регистрируются через `APP_FILTER`/`APP_PIPE`;
  - удалён `@nestjs-modules/mailer` (CVE).

  На `main` сейчас `forbidNonWhitelisted: false` (`main.ts:33`), и фильтр не зарегистрирован.
- `fix/cron-row-locking` (2 коммита, 2026-09-09) — TASK-105/111.
- Ветки разошлись с `main` больше чем на месяц, конфликты почти неизбежны. После включения строгого
  пайпа проверить фронты на лишние поля в теле запросов. Уже известное — `domain` в логине CRM (TASK-503).

### TASK-551: бэкапы БД на Dokploy `[ ]` — Вадим, в панели Dokploy

- В `PRODUCT_SITES.md` бэкапы отмечены как несделанные. До первого клиента: бэкапы Postgres
  (`pafpaf` и `site`) по расписанию во внешнее хранилище и один проверенный прогон восстановления.
- 2026-10-11: решено настраивать встроенными бэкапами Dokploy. Пошагово, включая медиа сайта, versioning
  bucket с файлами участников и проверку восстановления, — `infra/dokploy/README.md` → «Бэкапы».
  Хранилище только в ЕС.

### TASK-552: почта на проде `[ ]` — Вадим, в панели Dokploy

- Без `MAIL_HOST` письма молча не уходят. Проверить SMTP в Dokploy на трёх письмах: регистрация,
  сброс пароля, приглашение сотрудника.
- 2026-10-11: провайдер только из ЕС (Amazon SES `eu-north-1` или Brevo). Beget был только в устаревшем
  `infra/compose/env/api.env.example`, убран. Что стоит на проде, видно лишь в Dokploy → Environment.
  Инструкция — `infra/dokploy/README.md` → «Почта».

### TASK-554: персональные данные из уведомлений Telegram `[x]` — `fix/prod-privacy-backups`, 2026-10-11

- Telegram вне ЕЭЗ без решения об адекватности. В уведомления уходили email получателя письма подтверждения,
  в том числе участников клубов, а также имя и email владельца нового клуба.
- Теперь в Telegram только тема письма и название и slug клуба. Владельца ищем в админке по slug.

### TASK-555: юридические страницы и ссылки на них `[ ]` P0

- Нужны ФИО, NIF и адрес Вадима для Aviso legal. Список страниц и их содержание — в личном юр. обзоре
  от 2026-10-11 (ссылка в памяти агента, в репозиторий не кладём).
- Сайт (Payload): страниц Aviso legal, Privacidad, Cookies, Términos нет, ссылок в футере тоже — все адреса 404.
  Основная версия es, затем en и ru.
- CRM, регистрация клуба: это точка заключения договора, но там нет ни согласия, ни ссылок. Ключи
  `auth.register.terms/privacy/privacyPolicy` лежат в переводах и нигде не используются. Нужна галочка
  «принимаю условия, политику и DPA» с сохранением версии и даты.
- Кабинет участника (`apps/web`): форма регистрации и футер ссылаются на `/privacy` и `/terms`, которых нет (404).
- 2026-10-11, ветка `feat/legal-pages`: на сайте шесть документов в es/en/ru по адресам `/{locale}/legal/{aviso-legal|privacidad|cookies|
  terminos|encargo|subencargados}`, ссылки в футере. Тексты лежат в коде (`apps/site/modules/legal/content`), версия —
  `LEGAL_VERSION`. Пока это черновики: `noindex`, NIF, адрес и email подсвечены заглушками (`modules/legal/provider.ts`).
  Там же партнёрская страница `/ru/partners`: `noindex, nofollow`, ссылок на неё нет.
- Осталось: заполнить NIF, адрес и email; проверка юристом; затем `LEGAL_INDEXABLE = true`. Галочка согласия при
  регистрации клуба с сохранением `LEGAL_VERSION` и даты; ссылки в кабинете участника — на страницы сайта.
- Тексты исходят из того, что бэкапы (TASK-551) и почта в ЕС (TASK-552) настроены: до этого обещания о резервных
  копиях и субобработчике почты не соответствуют действительности.
- 2026-10-11, ветка `feat/legal-consent`: на юр. страницах email `savchuckvadim@gmail.com`. Регистрация клуба в CRM:
  обязательная галочка со ссылками на Términos, Contrato de encargo и Privacidad. `POST /platform/portals/register`
  без `acceptTerms: true` отвечает 400; в `portals` пишутся `terms_accepted_at`, `terms_version`
  (`LEGAL_TERMS_VERSION` в `apps/api/src/common/legal/legal-terms.ts`, менять вместе с `LEGAL_VERSION`) и
  `terms_accepted_by_user_id`. Та же галочка в старой форме регистрации `apps/admin`. Кабинет участника: ссылки
  в футере и форме регистрации ведут на `/{locale}/legal/privacidad` и `/terminos` сайта. Адрес сайта во фронтах —
  `NEXT_PUBLIC_SITE_URL`, по умолчанию `https://paf-paf.app`.
- Осталось: NIF и адрес, проверка юристом, затем `LEGAL_INDEXABLE = true`. Клубы, зарегистрированные до этого
  изменения, согласия не давали: попросить принять условия при входе или письмом.

### TASK-553: остальное по проду `[ ]` P1

- Проверить GitHub-переменные `NEXT_PUBLIC_API_URL` и `NEXT_PUBLIC_CRM_URL`: они вшиваются при сборке.
- Dev: у `apps/admin` и `apps/site` один порт 5002, развести.
- P2: автодеплой, `turbo prune` для образов.

---

## G. Документация — P1

### TASK-560: CLAUDE.md под PafPaf `[ ]`

- Заголовок и дерево репозитория, `packages/dynamic-forms`, порты, раздел про `apps/site` и Dokploy.
- Guards: `MembershipGuard` вместо `PortalTenantMatchGuard`, плюс `PortalCrmSubscriptionGuard` (402).
- Модель auth: глобальный `User` с членствами, единая таблица `refresh_tokens`, роль `portal_owner`.
- Реальные маршруты:
  - CRM: `member`, `product`, `order`, `entities`, `finance`, `settings`;
  - кабинет участника: `/{locale}/profile/*`, `/clubs`.
- Env:
  - `PLATFORM_BOOTSTRAP_ADMIN_*`;
  - `MAIL_LOGIN` / `MAIL_PASSWORD` / `SMTP_FROM`;
  - cookie-домены, `ENCRYPTION_MASTER_KEY`, `RUN_MIGRATIONS` / `RUN_SEED`;
  - переменные сайта.
- Пункт про строгий ValidationPipe и фильтр ошибок станет правдой только после TASK-550.

### TASK-561: архив и удаление устаревшего `[ ]`

- Удалить или перенести в `documentation/archive/`:
  - корневые `TASKS.md` и `DOCUMENTATION.md`;
  - `crm/CRM_IMPLEMENTATION_PLAN.md`, `crm/EMPLOYEE_AUTH_DETAILED_TASK.md`, `crm/FSD_STRICT_REFACTOR_PLAN.md`;
  - `crm/MULTI_TENANT_MICROSAAS_PLAN.md` — сначала вынести из него §11–13;
  - `tasks/deployment.md`;
  - `todo.md` — его содержание уже в TASK-530/531;
  - `правки.md` — правила перенести в `backend/MODULE_DEVELOPMENT_PRINCIPLES.md`.
- `VPS_SETUP.md` пометить как legacy. Основным документом по деплою сделать `infra/dokploy/README.md`,
  а `DEPLOYMENT.md` сократить до справочника.

### TASK-562: обновить доки, которые противоречат коду `[ ]`

- `AUTHENTICATION.md`, `backend/HTTP_API_CONTRACT.md:83`, `backend/README.md`,
  `crm/MVP_MULTITENANT_AUTH_CONTRACT.md` и `crm/MULTITENANT_NEXTJS_AUTH_PLAYBOOK.md` слить в один
  актуальный контракт auth.
- `site/README.md` описывает `apps/web` как сайт клуба. Переписать: теперь это кабинет участника и каталог клубов.
- Индекс `documentation/README.md`.
- Статусы в `tasks/rebranding-and-positioning.md`: 406 и 407 в основном сделаны, 403 и 404 — частично.
  Шапка `tasks/multitenant.md` тоже устарела.

### TASK-563: HISTORY.md за сентябрь–октябрь `[ ]`

- После 2026-08-26 записей нет. Не попали: загрузки (TASK-309), аудит безопасности, темы CRM, `apps/site`,
  Dokploy, публичные тарифы.

### TASK-564: скилл `project-checkin` `[x]` — `chore/checkin-skill`

- `.claude/skills/project-checkin/SKILL.md`: заменить Gran Kush на PafPaf и удалить список «известных пробелов»
  от 2026-07-14 — они давно закрыты. Основным чек-листом сделать этот файл.

---

## H. Notion — страница проекта

Прочитана страница «CRM для испанских клубов» (HQ → Projects). Базу Tasks прочитать не удалось:
Notion MCP в сессии не был подключён.

### TASK-570: обновить карточку проекта `[~]`

- Переименовать в PafPaf с пометкой, что Nagual — запасная концепция. То же в базах «CSC CRM Competitor Research»,
  «CSC CRM — Copywriting» и в «CSC CRM Content Engine Brief».
- Goal: срок «к ~16.10.2026» наступает через неделю. Переписать цель под этот план: офлайн-продажа, затем
  онлайн-оплата.
- Статус `backlog` сменить на «в работе», пересмотреть приоритет P2.
- Разделы «Описание», «Проблемы», «Цель», «Ценности», «Команда» и «Задачи» — черновики агента с пометкой
  «Уточнить у Вадима». Заполнить фактами: сайт развёрнут, тарифы Calada / Club / Cadena, стек, текущая стадия.
- Сделано 2026-10-11: карточка «PafPaf — CRM для клубов», статус active, P1, новая цель; «Описание», «Цель», «Стэк»,
  «Артефакты», «Задачи» — фактами. Не сделано: переименование баз CSC CRM и Content Engine Brief; «Проблемы»,
  «Ценности», «Команда» остались черновиками — нужны ответы Вадима.

### TASK-571: задачи плана — в базу Tasks `[x]`

- Завести P0-задачи из этого файла карточками со ссылкой на проект. Перед этим проверить, что уже лежит в Tasks и Inbox.
- Сделано 2026-10-11: 15 открытых задач P0 (биллинг, бренд, бэкапы, почта, деплой, сайт). В Tasks по проекту до этого были
  только 5 маркетинговых задач от 13.07 (просрочены), Inbox с 14.07 пуст.

### TASK-572: идеи по обходу конкурентов → решения `[ ]`

- Часть идей уже реализована: на сайте есть публичные прозрачные тарифы. Отметить сделанное и выбрать
  1–2 идеи в продукт, например импорт из Excel или дашборд владельца. Дашборда в CRM нет, см. TASK-523.

---

## Дальше — после запуска

PafPaf задуман как CRM не только для клубов. Следующие ниши — тату-салоны и похожий сервисный бизнес.
Что для этого понадобится:

- **Виды портала.** Шаблон вертикали при регистрации: поля, сущности, стадии, тексты. Основа уже есть —
  `provision-portal-from-templates.service.ts` и EAV-сущности.
- **Мессенджер** с клиентами.
- **Онлайн-запись.**
- **Мобильное приложение.** Bearer-auth для мобильных (`crm/mobile/auth/*`, `lk/mobile/auth/*`) уже есть.

Что из этого следует уже сейчас: не зашивать «клуб» и каннабис-лексику в ядро CRM и в бренд-константы
(TASK-531/532). Тексты, специфичные для ниши, должны жить в шаблоне вертикали.
