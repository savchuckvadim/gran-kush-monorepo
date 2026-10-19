# Несколько ниш, три сайта, SEO и коммуникации (TASK-750…786)

Дата: 2026-10-19. Ветка `main`, HEAD `9ac688e`. Источники: обход `apps/site`, `apps/api`, `apps/crm`
тремя агентами, Notion (проект «PafPaf — CRM для клубов», база Tasks, «CSC CRM Competitor Research»),
инвентаризация мессенджера Sociopath (`C:\Projects\tz\auth-mono`), веб-ресерч по рынку и SEO.
Нумерация продолжает [auth-platform](auth-platform.md) (TASK-742), легенда как в
[pafpaf-launch](pafpaf-launch.md): `[ ]` / `[~]` / `[x]`, P0 / P1 / P2.
Ручная часть SEO (без кода) — [marketing/seo-playbook](../marketing/seo-playbook.md).

Смежное: TASK-511 (долгий триал), 531/532 (бренд без «клуба»), 580/652/653 (мессенджер — поглощены
разделом D), 651 (интеграции), 675 (Telegram-бот), 672 (слайдер сущностей) — [crm-polish](crm-polish.md),
[pafpaf-launch](pafpaf-launch.md); раздел «Дальше — после запуска» там же.

---

## Решения Вадима (2026-10-19)

1. **Одна платформа, ниша = тип портала.** Отдельных приложений по нишам нет. `PortalTypeEnum
   { CLUB, TATTOO_STUDIO, BEAUTY_STUDIO }` уже в схеме (`apps/api/prisma/schema.prisma:24`), но никем не
   читается — становится сквозным. Музыкальные студии — позже, отдельным значением.
2. **Три сайта на одном движке `apps/site`**: клубы (`paf-paf.app`), тату, бьюти — свои домены, имена и
   палитры. Дизайн PafPaf — база для всех: бьюти — более свежая, молодая, розовая и дерзкая палитра; тату —
   вместо дыма эффект чернил/краски. Отдельные темы с нуля не делаем.
3. **Nagual — только скин CRM** (`nagual` в `SKIN_IDS`). Сайта и приложения Nagual не будет; stub
   `apps/site/modules/sites/nagual` удаляется.
3a. **Бренд-архитектура — «дом брендов» с тихим зонтиком.** Наружу три самостоятельных бренда: PafPaf —
   только клубы; тату и бьюти — свои имена, домены, иконки, почта, без упоминания PafPaf (клиентка салона
   не должна через бренд выходить на каннабис; Ads, Meta и Stripe смотрят на домен). Внутри — одна
   платформа и одно юрлицо-зонтик с нейтральным именем: aviso legal, приватность, GitHub, LinkedIn,
   «© <Зонтик> S.L.» в футере. CRM одна, вывеска по хосту: `crm.<бренд>` / `app.<бренд>` — алиасы того же
   контейнера (как `club.paf-paf.app`), `packages/brand` подставляет имя, логотип, цвета, отправителя по
   типу портала (TASK-751/763). TASK-770 = два имени ниш + имя зонтика + домены.
4. **Клубы — бесплатно** (TASK-511, долгий триал) как якорь и полигон для SEO. Деньги — в тату и бьюти:
   онлайн-запись, напоминания, предоплата. Оплату на сайте не форсируем.
5. **Тарифы**: Barrio 25 € / Club 49 € / Cadena 99 € (Calada переименован, миграция `rename_plan_barrio`).
6. **Мессенджер**: свой чат из Sociopath целиком не переносим. Сначала уведомления и журнал портала,
   затем Inbox с моделью диалогов, независимой от канала, и адаптеры Telegram → WhatsApp. In-app канал —
   позже, на той же модели, с выборочным переносом из Sociopath (раздел D).
7. **Verifactu** — не обещать «готово». Закон: 01.01.2027 (SL) / 01.07.2027 (autónomos), RDL 15/2025;
   05.10.2026 анонсирован перенос на октябрь 2028, в BOE нет. Модуль фактур — после первых платящих студий.

---

## Коротко: что уже есть и чего нет

| Есть | Нет |
|---|---|
| `Portal.type`, шаблоны полей с `applicablePortalTypes`, `provisionPortal(portalId, type)` | Выбор ниши при регистрации; CRM не знает тип портала |
| EAV-сущности, воронки/стадии, канбан, формы, `UiSetting`, `PortalRole` | Переключение разделов по типу портала |
| i18n ru/en/es, ~2 250 строк на локаль | Словарь: «socio/club/member» в сотнях строк, без переменных |
| Документы, подпись, consent-флоу участника | Услуги (без склада), запись/календарь/расписание |
| Telegram-вход, Telegram-алерты админу | Диалоги с клиентами, уведомления, журнал действий |
| Сайт: pages/sites/plans, sitemap+hreflang, canonical, OG, JSON-LD, robots | Сайт выбирается при сборке, а Dockerfile/CI не передают `NEXT_PUBLIC_SITE`; тарифы без `site`; тексты/OG/иконки — PafPaf; аналитики нет; блога нет |

---

## A. Ядро вертикалей — `feat/verticals-core`

### TASK-750: тип портала сквозной `[ ]` P0

- [ ] `CreateClubDto.type` (`vertical`), `POST /platform/portals/register` и `POST /crm/my-portals` принимают тип;
      `ClubFoundingService.found()` → `provisionPortal(portalId, type)`; переименовать в `PortalFoundingService`
- [ ] Регистрация в CRM: шаг «Что у вас?» (клуб / тату-студия / салон); с сайта — `?vertical=` в `crmHref`
      (`apps/site/modules/shared/config/routes.ts`), предвыбор и скрытие шага
- [ ] `portal-info.dto` и `me` отдают `type`; в CRM `usePortalType()` в контексте портала
- [ ] Пресеты в одном месте: `apps/api/src/common/verticals/presets.ts` — `{ type, modules[], vocabulary,
      templates }`; `GlobalEntityTemplate.applicablePortalTypes` и `modulesJson` начинают читаться
- [ ] e2e: регистрация трёх типов, провижининг по типу

### TASK-751: словарь вертикали в i18n `[ ]` P0

- [ ] Оверлей сообщений: базовые `messages/{locale}/crm.json` + `messages/{locale}/vertical/{club,tattoo,beauty}.json`
      только с ключами, где термины различаются (участник/клиент, клуб/студия, socio/cliente); deep-merge при
      загрузке по типу портала (`apps/crm/i18n.ts`, `public-messages.ts`)
- [ ] Пройти `crm.json`, `cabinet.json`, `navigation.json`: вынести нишевые строки в оверлей club, в базе —
      нейтральные (клиент, организация)
- [ ] Письма (`apps/api` mail-шаблоны) без «клуб»: `packages/brand` из TASK-531 + словарь по типу

### TASK-752: модули по типу портала `[ ]` P0

- [ ] `modules[]` из пресета → `portal-info`; `crm-navigation.hook.tsx` и `settings-hub-page.tsx` фильтруют
      по модулям: `attendance`/`presence` — club; `booking`, `services` — студии; `orders`, `catalog`,
      `finance`, `employees`, `clients` — все
- [ ] Кабинет: разделы по модулям (QR/присутствие — club; «мои записи» — студии)
- [ ] Гард на API: маршруты модуля, выключенного для типа, отвечают 404

### TASK-753: каннабис-специфика — только в пресете club `[ ]` P1

- [ ] `global-templates.seed.ts`: `is_medical/is_mj/is_recreation` — `applicablePortalTypes: [CLUB]`
- [ ] `Product.thc/cbd/strain/audiences/limitGramsPerUnit`, `Member.monthlyLimitGrams`, `ClubPolicy`
      (граммы), `OrderItem.limitGrams`, лимиты в `orders` — показывать и валидировать только при CLUB
      (минимальное изменение: поля остаются, UI и правила — за флагом модуля `club-policy`)
- [ ] Swagger-примеры и сиды без сортов

### TASK-754: услуги `[ ]` P0 (студии)

- [ ] `Product.kind` enum `PRODUCT | SERVICE` + `durationMinutes`, `staffIds` (сотрудники, которые её
      оказывают); для SERVICE склад не ведётся (`currentQuantity` null, проверки списания пропускаются)
- [ ] CRM: вкладка «Услуги» в каталоге по модулю `services`; форма без склада и THC
- [ ] Заказ со строкой-услугой (студия продаёт и товар, и услугу в один чек)

### TASK-755: онлайн-запись v1 `[ ]` P0 (студии)

- [ ] Модели: `Appointment` (portalId, memberId, employeeId, productId(SERVICE), startsAt, endsAt, note,
      stageId, source CABINET|PUBLIC|STAFF), `StaffSchedule` (employeeId, weekday, from, to) +
      `StaffScheduleException` (дата, выходной/окно); воронка `appointment`: Requested → Confirmed →
      Done / Cancelled / NoShow через `StageCategory`
- [ ] `BookingSettings` на портал: шаг слота, минимальный lead time, горизонт, подтверждение авто/вручную
- [ ] API: свободные слоты `GET …/booking/slots?serviceId&employeeId&date`, создание заявки из кабинета и
      публичной страницы, подтверждение/перенос/отмена персоналом; use-case `request-appointment.use-case.ts`
- [ ] Публичная страница записи `/{locale}/{portal}/book` на домене кабинета: услуга → мастер → слот →
      контакт (вход или быстрая регистрация клиента) → «заявка отправлена»
- [ ] События (TASK-780): `appointment.requested / confirmed / rescheduled / cancelled`; уведомления —
      их потребитель: заявка персоналу, подтверждение клиенту, напоминание за 24 ч
- [ ] e2e: слоты не пересекаются, расписание и исключения, подтверждение вручную

### TASK-756: канбан процедур мастера и живая очередь `[ ]` P0 (студии)

- [ ] Стадии дня у мастера: Confirmed → Arrived → InProgress → Finishing → Done (воронка `appointment`
      продолжается, стадии со временем); фактические `arrivedAt`, `startedAt`, `finishedAt`; кнопки
      «клиент пришёл», «начал», «+15 мин», «закончил» — одно нажатие с телефона
- [ ] Расчёт задержки: ожидаемый конец текущей процедуры = `max(plannedEnd, startedAt + duration +
      extensions)`; для каждой следующей записи мастера `expectedStartAt` и `delayMinutes`; пересчёт при
      каждом переходе стадии и по таймеру; событие `appointment.delay_changed` при изменении больше порога
      (настройка портала, по умолчанию 10 мин)
- [ ] Кабинет клиента: «Ваша запись в 16:00 — начнётся вовремя / с задержкой ~15 мин, мастер ещё с
      предыдущим клиентом»; то же на публичной странице по ссылке из уведомления; уведомление в Telegram
      при изменении задержки (TASK-781)
- [ ] CRM: раздел «Записи» — день/неделя по мастерам, канбан дня (переиспользовать канбан заказов и
      слайдер TASK-672), список заявок; быстрое создание записи персоналом (source STAFF)
- [ ] e2e: цепочка из трёх записей, задержка первой сдвигает ожидаемое начало остальных, порог события

### TASK-757: consentimiento informado для тату `[ ]` P1

- [ ] Переиспользовать consent-флоу участника (документы, подпись, версия согласия): шаблон согласия
      на портал с полями по нормативе автономии (данные студии и мастера, практика, риски, уход; для
      несовершеннолетних — представитель), привязка к `Appointment`
- [ ] Подпись на планшете в студии (есть `signature`), PDF на выходе (react-pdf уже в `apps/site` —
      вынести генератор в общий пакет или на API)
- [ ] Хранение по сроку, выгрузка для инспекции

### TASK-758: предоплата / señal `[ ]` P2

- [ ] v1: запись о депозите вручную в `finance` при подтверждении записи, статус «señal pagada»
- [ ] v2: Stripe Checkout от имени портала (Stripe Connect) — после первых платящих студий

### TASK-759: ИИ-функции — концепт `[ ]` P2

- [ ] После первых платящих. Кандидаты: голосовое → заявка на запись, сводка диалога, автоответ по
      свободным слотам (на модели Inbox, раздел D). Не раньше.

---

## B. Три сайта — `feat/site-verticals`

### TASK-760: сборка и деплой трёх сайтов `[ ]` P0

- [ ] `infra/docker/next.Dockerfile`: build-args `NEXT_PUBLIC_SITE`, `NEXT_PUBLIC_SERVER_URL`
- [ ] `.github/workflows/deploy.yml`: матрица `site-club`, `site-tattoo`, `site-beauty` (образы
      `ghcr…/site:<code>`); `infra/dokploy/docker-compose.yml`: три сервиса на одной БД `site` и одном
      томе media, домены в Traefik; Cloudflare-зоны (TASK-770)
- [ ] `PAYLOAD_SEED_IF_EMPTY` сидит все три сайта; `/admin` — только в club-сборке (как сейчас)

### TASK-761: единый список сайтов, без Nagual `[ ]` P0

- [ ] `SITES` в одном месте (`modules/shared/config/site.ts`), `next.config.ts` импортирует; `SITE_OPTIONS`
      и enum в Payload из него; миграция: `tattoo`, `beauty` в `enum_pages_site`/`enum_sites_code`, `nagual` —
      удалить (данных нет)
- [ ] Удалить `modules/sites/nagual`, `nagual.club` из `PRODUCTION_URLS`; `design/sites/nagual` — референс

### TASK-762: тема = база PafPaf + палитра + эффект `[ ]` P0

- [ ] `modules/sites/pafpaf/{frame,blocks,ui}` → `modules/sites/base`; `modules/sites/<code>/theme.ts` задаёт
      токены (палитра, шрифты), логотип/имя, эффект героя `smoke | ink | glow`, тексты-дефолты
- [ ] Эффект `ink` для тату: тот же WebGL-слой, но текстура/физика чернил или краски вместо дыма; подсказка
      «Toca el humo» → из темы
- [ ] Бьюти: розовая, более молодая и дерзкая палитра; эффект — `glow`/жидкость (решить по макету)
- [ ] localStorage-ключи `pafpaf.*` → `${SITE}.*`; `aria-label`, логотип-текст — из темы

### TASK-763: тексты, OG и иконки по сайту `[ ]` P0

- [ ] Оверлей `messages/{locale}.json` + `messages/<site>/{locale}.json` (tagline, footer, словарь
      socio/cliente, pricing.badge)
- [ ] `og-image.tsx`, `app/icon.svg`, `favicon.ico`, `apple-icon.tsx` — из темы сайта
- [ ] Legal: домены и имя из `sites` doc, один `PROVIDER`; партнёрская страница — только club
- [ ] `crmHref` передаёт `?vertical=<type>`

### TASK-764: тарифы по сайту `[ ]` P1

- [ ] `plans.site` (или `vertical`) в Payload + миграция; коды биллинга `<vertical>-<plan>-<period>`;
      `GET /platform/billing/plans?vertical=`; сайт фильтрует по `SITE`
- [ ] Цены студий — решение Вадима (ориентир рынка: TattooNet 15 €, Booksy 35 € + 8 €/сотрудник,
      Fresha 0 € + 2,2–2,6 % с оплат)

### TASK-765: блоки для студий `[ ]` P1

- [ ] Наборы блоков по сайту: студии без `qrDoor`, `limitFlask`, `clubsMerge`, `privacyRoles`; новые
      `bookingDemo` (слот → подтверждение), `consentFlow` (тату), `reminders`; `FEATURE_ICONS` расширить

### TASK-766: seed-контент тату и бьюти `[ ]` P0

- [ ] `SITE_DOC` на три сайта, страницы `home`/`precios` es/ru/en под каждую нишу (копирайт по
      seo-playbook §2–3, без обещаний функций, которых нет — см. TASK-755/757)
- [ ] «Hecho en Torrevieja» и контакты — в `sites.footerNote`/`contacts`

### TASK-767: блог `[ ]` P1

- [ ] Коллекция `posts`: `site`, `slug`, `title`/`excerpt`/`body` (Lexical rich text, localized), `cover`,
      `author`, `publishedAt`, `seo`; рендер Lexical → React; маршруты `/{locale}/blog`, `/{locale}/blog/{slug}`
- [ ] JSON-LD `Article`, OG из cover, в sitemap, RSS; «похожие статьи»

### TASK-768: аналитика без cookies и верификация `[ ]` P0

- [ ] Plausible CE (или Umami) в `infra/dokploy` как сервис; скрипт на сайте по `NEXT_PUBLIC_ANALYTICS_URL`;
      события `cta_try`, `cta_pricing`, `cta_contact`
- [ ] Юр. тексты: «no analytics» → «analítica sin cookies»
- [ ] GSC/Bing — верификация по DNS (руками, TASK-771); `apps/site/app/llms.txt` — краткое описание продукта
      и ссылки (без ожиданий эффекта)

### TASK-769: технический SEO `[ ]` P1

- [ ] ISR вместо `force-dynamic`: `revalidate` на страницах + on-demand revalidate из Payload-хука
- [ ] `next/image` для media, `title.template` и дефолтные title/description, per-page OG из CMS (поле
      `seo.image`)
- [ ] Legal в sitemap, когда станут индексируемыми (нужен NIF, TASK-555); 404 сервером где возможно

---

## C. SEO-запуск — без кода, по [seo-playbook](../marketing/seo-playbook.md)

### TASK-770: имена и домены для тату и бьюти `[ ]` P0 — решение Вадима

- [ ] Названия брендов (paf-paf — каннабис-коннотация, студиям нужны свои) + нейтральное имя зонтика
      для юр. текстов; домены, Cloudflare-зоны, почта отправителя на доменах; `crm.`/`app.` алиасы CRM на
      каждом домене

### TASK-771: Search Console, Bing, аналитика, журнал `[ ]` P0

- [ ] Domain property в GSC для трёх доменов, sitemap, оповещения; Bing импорт; таблица `keywords/content/links`;
      скриншот нулевой точки

### TASK-772: семантика с объёмами `[ ]` P0

- [ ] Keyword Planner по кластерам из плейбука §2 для трёх ниш, объёмы в таблицу, по одной целевой
      странице на кластер

### TASK-773: контент-план и первые 4 статьи `[ ]` P1

- [ ] Ритм 1 статья/неделю по кругу клубы → тату → бьюти; первые темы: cómo abrir una asociación
      cannábica; consentimiento informado tatuaje (плантилья); cómo reducir no-shows; alternativa a Booksy

### TASK-774: листинги и ссылки `[ ]` P1

- [ ] Capterra/GetApp ES, G2, Product Hunt, AlternativeTo; профили GitHub/LinkedIn/Crunchbase; бейдж
      «Gestionado con …» первым клиентам

### TASK-775: отчётный ритуал `[ ]` P1

- [ ] Понедельник 20 мин (GSC, индексация, Plausible), первая пятница месяца 1 час (позиции, ссылки, CWV,
      AI-видимость), запись в Notion «Маркетинг — активность»; Looker Studio на три сайта

---

## D. События, уведомления, журнал, Inbox — `feat/domain-events`, `feat/inbox`

Принцип: **одна шина событий CRM**, всё остальное — её потребители. Уведомления, история портала, интеграции,
будущие вебхуки и ИИ читают одни и те же события; ни один сервис не шлёт письмо и не пишет журнал сам.

### TASK-780: доменные события CRM — шина с outbox `[ ]` P0 — продумать до кода

- [ ] **Контракт события**: `{ id: uuid, name: 'order.stage_changed', version: 1, portalId, occurredAt,
      actor: { kind: EMPLOYEE|MEMBER|SYSTEM, id }, aggregate: { kind, id }, payload }`; имена
      `<aggregate>.<past_tense>`; payload типизирован, без Prisma-типов; события — часть публичного
      контракта (документ `documentation/backend/DOMAIN_EVENTS.md` с каталогом)
- [ ] **Каталог** `apps/api/src/common/events/catalog.ts`: типы payload по имени, описание, «кому
      интересно» (член/сотрудник/система) — из него же строятся типы уведомлений и фильтры журнала.
      v1: `portal.founded`, `member.joined / consent_pending / consent_given / left`, `document.uploaded /
      shared`, `order.placed / stage_changed / cancelled`, `appointment.requested / confirmed / rescheduled /
      cancelled / started / finished / delay_changed`, `employee.invited / joined`, `presence.entered / left`,
      `subscription.changed`
- [ ] **Публикация — transactional outbox**: use-case пишет событие в таблицу `domain_events` в той же
      транзакции Prisma, что и изменение (`EventPublisher.publish(tx, event)`); никаких in-process
      `EventEmitter` как единственного пути — события не теряются при падении процесса
- [ ] **Релей**: BullMQ-воркер читает непереданные строки `domain_events` (индекс по `dispatchedAt null`),
      кладёт в очередь `domain-events` с `jobId = buildJobId(event.id)`; помечает `dispatchedAt`; масштаб —
      пакетами, несколько воркеров безопасно (SELECT … FOR UPDATE SKIP LOCKED)
- [ ] **Потребители**: `@OnDomainEvent('order.stage_changed')` на методах классов-консьюмеров в своих
      модулях (notifications, activity-log, integrations); реестр через `DiscoveryService`; каждый
      консьюмер идемпотентен — таблица `event_deliveries (eventId, consumer, deliveredAt)`; ошибка одного
      консьюмера не блокирует остальных (fan-out: одна job на пару событие × консьюмер)
- [ ] **Порядок и повторы**: порядок гарантируется только внутри агрегата по `occurredAt` + `sequence`;
      консьюмеры терпимы к перестановке и повтору; retry с backoff, dead-letter очередь, алерт в Telegram
- [ ] **Хранение**: `domain_events` — источник правды для журнала (TASK-782 — его проекция); индекс
      `(portalId, occurredAt)`, `(aggregateKind, aggregateId)`; архивация старше N дней по тарифу
- [ ] **Миграция существующего**: очередь `portal-events` и письма из сервисов переводятся на события;
      `portal.founded` → welcome-письмо через потребителя
- [ ] **Тесты**: e2e «событие в outbox в той транзакции; откат транзакции — события нет», релей
      идемпотентен, консьюмер получает ровно один раз при повторе job; контрактные тесты payload по каталогу
- [ ] **Нагрузка**: оценка — тысячи событий/день на портал; одна таблица, без партиционирования до 10 M строк

### TASK-781: уведомления — потребитель событий `[ ]` P0

- [ ] Модели: `Notification` (portalId, recipientKind EMPLOYEE|MEMBER, recipientId, eventId, type,
      payloadJson, readAt), `NotificationPreference` (recipient × type × channel IN_APP|EMAIL|TELEGRAM)
- [ ] `NotificationRules`: событие → кому (роли/права сотрудников по каталогу прав; участник — свои
      агрегаты) → какие каналы по умолчанию; правила декларативно в `apps/api/src/modules/notifications/rules.ts`
- [ ] Доставка: in-app (запись), mail (очередь `mail`, есть), Telegram (бот TASK-784; до него — общий
      `TelegramService`); дедупликация и «тихие часы» по настройке портала; напоминания — отложенные job
      (`appointment.confirmed` → job на `startsAt − 24h`, отменяется при `cancelled/rescheduled`)
- [ ] UI: колокольчик в шапке CRM и кабинета, список, «прочитано», настройки каналов в профиле; бейдж
      непрочитанных в меню
- [ ] e2e: матрица правил (кто что получает), отмена напоминания при переносе, предпочтения каналов

### TASK-782: история портала — проекция событий `[ ]` P0

- [ ] Журнал = чтение `domain_events` по порталу/агрегату с человекочитаемым рендером из каталога
      (`i18n` по имени события и payload); отдельной таблицы `ActivityLog` нет, пока не нужен diff полей
- [ ] Diff для записей EAV: событие `record.updated` несёт `changes: { field, from, to }[]` — пишется в
      use-case обновления
- [ ] UI: вкладка «История» в карточке сущности (слайдер TASK-672) и «Журнал» в настройках с фильтрами
      по сущности/сотруднику/дате; журнал доступа к документам (`account`) — те же события
- [ ] Retention по тарифу; экспорт CSV

### TASK-783: Inbox — диалоги, независимые от канала `[ ]` P0 — потребитель и источник событий

- [ ] Модели: `Conversation` (portalId, memberId | contactJson, channel TELEGRAM|WHATSAPP|INAPP, externalId,
      assignedEmployeeId, lastMessageAt, unreadCount), `ConversationMessage` (direction IN|OUT, text,
      attachmentsJson, externalMessageId, status SENT|DELIVERED|READ|FAILED, authorEmployeeId)
- [ ] Интерфейс `ChannelAdapter { send(conversation, message), parseInbound(payload) }`, реестр адаптеров;
      вебхуки `POST /integrations/<channel>/<portalId>`
- [ ] UI CRM: раздел «Сообщения»: список диалогов, тред, композер; «написать клиенту» из карточки
      (закрывает TASK-652). Из Sociopath взять после редизайна под `@workspace/ui` и i18n: `MessageList`,
      `MessageItem`, `ReplyQuote`, `ChatInputWidget` (TextArea/Send/Attachments), `UnreadCountBadge`,
      паттерны optimistic/outbox из `useSendMessage`
- [ ] Непрочитанные в меню; обновление через TanStack `refetchInterval`, WS — при TASK-786; входящее
      сообщение — событие `conversation.message_received` (уведомление сотруднику через TASK-781)

### TASK-784: Telegram-адаптер `[ ]` P0

- [ ] Бот портала: свой токен (BotFather, хранить через `ENCRYPTION_MASTER_KEY`) или общий бот PafPaf с
      привязкой `t.me/<бот>?start=<токен>` из кабинета (проработка TASK-675)
- [ ] Вебхук → `Conversation` по chatId; исходящие `sendMessage`/`sendPhoto`; статусы доставки
- [ ] Уведомления TASK-781 по тому же боту; «Настройки → Интеграции» (TASK-651): подключить бота, тест

### TASK-785: WhatsApp-адаптер `[ ]` P1

- [ ] WhatsApp Business Platform (Cloud API) напрямую или через BSP (360dialog, Twilio): верификация
      бизнеса в Meta, отдельный номер, шаблоны для исходящих вне 24-часового окна (напоминания о записи —
      utility, платно за сообщение). Актуальные тарифы: https://developers.facebook.com/docs/whatsapp/pricing
- [ ] Включать, когда студии попросят; архитектура адаптера готова с TASK-783

### TASK-786: In-app канал — перенос из Sociopath `[ ]` P2 (бывш. TASK-580)

Делать только если клиенты захотят чат в кабинете без мессенджеров. На модели TASK-783 как адаптер `INAPP`.
Инвентаризация Sociopath (2026-10-19): бэк `chats`+`messages` 38 файлов / 4,4 k строк, фронт ~145 файлов /
9,1 k строк; MySQL, Prisma 6, Next 15, Redux, socket.io без аутентификации, i18n нет, тестов нет.

- [ ] **Брать**: схему `Message` (reply, edit, soft-delete, metadata), `MessageAttachment` (upload до
      сообщения + cleanup orphan'ов), `MessageReadStatus`, typing (`useTypingEmit` 2,5 с), unread-бейджи,
      optimistic + localStorage outbox, `MessageList/MessageItem/ChatInput` UI
- [ ] **Не брать**: E2EE (`encryption`, libsignal, IndexedDB), секретные чаты и таймеры, `invitations`,
      `calls`/LiveKit, Redux, `packages/ws` (мёртвый), legacy `fileUrl*`, `ChatType.SECRET`
- [ ] **Рефакторинг при переносе (SOLID/DRY/KISS)**: гард членства в диалоге вместо 12 повторов
      `isMember → Forbidden`; одна модель прочтения (`lastReadAt`, без `MessageReadStatus` на каждую
      строку) и один endpoint «прочитано»; `messages.service` 647 строк → use-cases `send-message`,
      `forward-messages`, `mark-read`; маршрутизация push/socket — из gateway в сервис доставки; key
      factory TanStack и один источник ключей; константы WS-событий в `packages/api-client`; лимиты,
      интервалы и URL — в конфиг; N+1 в списке диалогов → один запрос с агрегатами; keyset-пагинация и
      подгрузка старых; sender-assembly из `page.tsx` в feature; i18n всех строк; `console.log` убрать
- [ ] **Транспорт**: socket.io на `@nestjs/websockets` с аутентификацией по сессии (cookie/Bearer, как
      REST), Redis-adapter для нескольких инстансов, CORS по `CORS_ORIGIN`
- [ ] **Дизайн**: `@workspace/ui` + скины CRM, без `text-[11px]`/`bg-black/60`; тред в слайдере (TASK-672)
- [ ] e2e: gateway (auth, join/leave, send, read), сервис отправки, адаптер

---

## Порядок

1. A750–752 (тип портала, словарь, модули) → без этого ни сайты, ни студии не имеют смысла.
2. B760–763, 766, 768 → три домена в сети с главной и ценами, аналитика, GSC. Параллельно C770–772 руками.
3. D780–782 (события, уведомления, журнал) → нужны и клубам, и студиям, и записи; 780 — проектировать
   отдельно, с ревью, до первой строки кода.
4. A754–756, 757 → услуги, запись, канбан процедур и живая очередь, согласие — продукт для тату; B765
   обновляет сайты под реальные функции.
5. D783–784 → Inbox и Telegram. C773–775 идут фоном еженедельно.
6. Остальное (758, 764, 767, 769, 785, 786, 759) — по спросу.
