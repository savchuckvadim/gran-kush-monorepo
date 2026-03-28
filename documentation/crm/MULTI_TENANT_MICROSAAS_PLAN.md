# Multi-Tenant / Multi-Portal CRM Plan

## 1) Цель

Перевести текущую систему из режима "один клуб = одна CRM" в платформу формата micro-SaaS:

- один backend + одна кодовая база;
- много порталов (клубов) в одной системе;
- отдельные данные, настройки, формы и доступы на каждый портал;
- платная подписка (например, 20 EUR/месяц) с контролем статуса оплаты;
- отдельная платформенная админка для финансов и управления порталами.

---

## 2) Базовые термины

- **Platform**: верхний уровень (наша SaaS-система).
- **Portal (Tenant, Club)**: клиент платформы, отдельный клуб.
- **Portal Owner (Root User портала)**: первый пользователь портала, создается при регистрации CRM.
- **Portal Employee**: сотрудники клуба внутри CRM-портала.
- **Member**: клиент клуба (посетитель/участник).
- **Platform Admin**: супер-админ нашей SaaS-платформы (не портал-админ).

---

## 3) Целевая архитектура (высокий уровень)

### 3.1 Принцип tenancy

Каждая бизнес-сущность хранит `portalId` (или связана через иерархию с сущностью, где есть `portalId`):

- employee, member, product, order, finance transaction, presence session, custom entity records и т.д.

Все запросы backend выполняются в рамках текущего `portalId`.

### 3.2 Где хранить границу портала

Рекомендуемый вариант:

- таблица `portals`;
- таблица `portal_domains` (поддержка нескольких доменов/поддоменов на портал);
- у сессии/токена всегда есть `portalId`;
- middleware определяет портал по домену или URL slug.

### 3.3 URL стратегия

Нужно поддержать два режима:

1. **Slug mode**: `/{portalSlug}/{locale}/crm/...` и `/{portalSlug}/{locale}/member/...`
2. **Domain mode**: `https://club-domain.com/{locale}/...`

Лучше заложить оба: slug как базовый, custom domain как платная/advanced опция.

---

## 4) Аутентификация и безопасность

## 4.1 Что менять

Текущая auth-модель должна стать tenant-aware:

- в access/refresh контексте хранить `portalId`, `userId`, `role`, `sessionId`;
- backend всегда сверяет, что пользователь работает только в своем портале;
- запрещать cross-portal доступ на уровне guard + query фильтров.

## 4.2 JWT vs Cookies/Sessions (что безопаснее)

Для web-приложений безопаснее перейти на:

- **HttpOnly + Secure + SameSite cookies** для refresh/session;
- короткий access token (или server session) с ротацией;
- refresh token rotation + revoke list;
- device/session management (logout all sessions).

Рекомендация:

- для браузера CRM/Web: cookie-based auth (BFF-friendly, меньше риск XSS-утечки токена);
- для внешних интеграций/API: отдельные API keys или OAuth client credentials.

## 4.3 Обязательные security controls

- RBAC + tenant isolation;
- audit log критичных действий;
- rate limiting по auth endpoint;
- brute-force protection;
- 2FA для platform admins (и желательно portal owners);
- secrets rotation, encryption at rest для чувствительных данных.

---

## 5) Роли и пользователи

## 5.1 Platform уровень

- `platform_admin` (seed при инициализации платформы);
- доступ к платформенной админке: порталы, биллинг, глобальные метрики, блокировки.

## 5.2 Portal уровень

- `portal_owner` (root пользователь портала, создается при signup);
- `portal_admin`;
- `portal_manager`;
- `portal_employee` (кастомизируемо позже).

Правило: `portal_owner` нельзя удалить из CRM портала (только transfer ownership + deactivate при строгих условиях).

---

## 6) Billing и подписка (20 EUR / month)

## 6.1 Основные сущности

- `subscriptions`
- `subscription_items/plans`
- `invoices`
- `payments`
- `payment_events` (webhook audit)
- `portal_billing_status`

## 6.2 Статусы подписки

- `trialing`, `active`, `past_due`, `grace_period`, `suspended`, `canceled`.

## 6.3 Гейтинг функционала

- при `active/trialing` -> полный доступ;
- при `past_due` -> предупреждения + ограниченный grace period;
- при `suspended` -> read-only или блок CRM входа (кроме owner/billing page);
- при `canceled` -> soft lock + экспорт/удаление по политике.

## 6.4 Платежный провайдер

Практично начать со Stripe:

- checkout portal owner;
- customer portal для self-service;
- webhook-driven source of truth;
- идемпотентные обработчики webhook.

---

## 7) Платформенная админка (Super Admin)

Нужен отдельный раздел/приложение:

- список порталов, статусы, план, MRR;
- финансовые движения по порталам;
- ручные операции (pause, resume, credits, force renew);
- мониторинг ошибок интеграций/webhooks;
- управление platform users/admins;
- support tools: impersonation (строго аудируемая), read-only debug.

---

## 8) Dynamic Fields и гибкая модель данных

> **Детализированный backlog по полям, статусам, настройкам, товарам и складу:** см. [FLEXIBLE_CRM_DOMAIN_TASKS.md](./FLEXIBLE_CRM_DOMAIN_TASKS.md) (развитие этой секции в виде эпиков и чеклистов по слоям API/CRM).

Ты правильно отметил: фиксированные DTO перестают подходить.

## 8.1 Модель metadata-driven fields

Минимальные сущности:

- `entity_definitions` (member, product, order, custom entity)
- `field_definitions`:
  - key/systemName
  - labels (i18n)
  - type (`string`, `number`, `select`, `date`, `boolean`, `email`, `phone`, `telegram`, `signature`, ...)
  - `required`
  - `isSystem`
  - `isPublic` (показывать во внешней регистрации)
  - `isMultiple`
  - validation rules (min/max/pattern/options)
  - stage binding (если применимо)

- `entity_records` + `field_values` (или JSONB с индексируемыми проекциями).

## 8.2 System fields vs User fields

- **System fields**: нельзя удалить, можно скрыть/переименовать label/менять порядок (в рамках правил).
- **User fields**: создаются/редактируются/архивируются клубом.

Важно: member/product/order нельзя удалять как сущности платформы, но можно:

- отключать модуль;
- скрывать пункты меню;
- ограничивать поля и сценарии.

## 8.3 Валидация frontend + backend

- backend хранит canonical validation schema (на основе field definitions);
- frontend получает schema и рендерит формы динамически;
- frontend валидирует для UX;
- backend валидирует обязательно повторно (source of truth).

Вместо жестких DTO:

- `payload: Record<string, unknown>` + schema validation per portal/entity.

## 8.4 Стадийные сущности (workflow/stages)

Для `order` и других process entities:

- `stage_definitions` per portal;
- `stage_transitions` (разрешенные переходы);
- SLA/timers/hooks в перспективе.

Для сущностей без стадий - plain CRUD режим.

---

## 9) Модули CRM (вкл/выкл)

По каждому порталу:

- attendance module: enabled/disabled;
- finance module: enabled/disabled;
- future modules аналогично.

Это влияет на:

- меню;
- API доступ;
- права;
- видимость данных в UI.

---

## 10) Web + Profile + Member cabinet и portal binding

Нужно жестко связать member flow с порталом:

- portal должен быть в URL (slug/domain);
- portal должен быть в сессии/токене;
- регистрация member всегда в рамках текущего портала;
- profile/LK читает и пишет данные только своего портала.

Пример:

- CRM: `/{portal}/{locale}/crm/...`
- Site/LK: `/{portal}/{locale}/...`, `/{portal}/{locale}/profile/...`

---

## 11) "Сайт из CRM" и настройка контента

Чтобы клуб мог использовать встроенный сайт без отдельной разработки:

- CMS-lite в CRM:
  - тексты блоков (hero, about, contacts, legal),
  - локализации,
  - включение/выключение блоков,
  - темы/brand tokens (logo/colors).

Для продвинутых клиентов:

- custom domain на portal site;
- simple page builder v1 (конфигурируемые блоки).

Если клиент хочет существующий сайт:

- встроенный registration widget/script + API;
- webhook/callback на события регистрации.

---

## 12) Custom domains (как сделать)

Технически:

- пользователь добавляет домен в CRM;
- система выдает DNS target (CNAME/A);
- автоматическая проверка владения;
- TLS сертификат через ACME (Let's Encrypt) автоматически;
- запись `domain -> portalId` в БД;
- edge/middleware маршрутизирует в нужный портал.

Нужно заложить:

- safe domain verification;
- revalidation/renewal cert;
- fallback domain (`portal.platform.com`).

---

## 13) Telegram notifications (один бот для всех)

Чтобы не плодить ботов:

- один platform bot;
- таблица `portal_telegram_settings` + mappings `telegram_chat_id <-> portalId/userId/memberId`;
- шаблоны уведомлений per portal;
- strict guard: бот отправляет только в контекст текущего портала.

Поддержать:

- уведомления сотрудникам (новый order, attendance alert);
- уведомления members (статус заказа, напоминания).

---

## 14) Изменения в текущем проекте (конкретно)

## 14.1 `apps/api`

- добавить core multi-tenant модуль:
  - portal resolution middleware;
  - tenant guard/context;
  - billing guard;
  - role guard.
- внедрить `portalId` в модели и репозитории;
- пересобрать auth под tenant-aware sessions/cookies;
- внедрить metadata-driven entities/fields.

## 14.2 `apps/crm`

- tenant-aware routing и контекст портала;
- settings UI:
  - modules on/off,
  - entity fields,
  - stages/workflows,
  - branding,
  - billing.
- portal owner management + root protection.

## 14.3 `apps/web`

- tenant-aware public routes;
- динамическая member registration form из field definitions;
- profile/LK с тем же tenant контекстом;
- CMS-driven блоки сайта.

## 14.4 `packages`

- `@workspace/api-client`: новые контракты multi-tenant;
- `@workspace/ui`: переиспользуемые layout/field-renderer для dynamic fields.

---

## 15) Пошаговый roadmap

## Phase 0 - Discovery & Design (1-2 недели)

- финализировать tenancy model;
- выбрать auth target architecture (cookie/session);
- спроектировать billing lifecycle;
- утвердить schema для dynamic fields/entities.

## Phase 1 - Platform Core (2-4 недели)

- `portals`, `portal_users`, `subscriptions`, `billing_events`;
- platform admin seed + basic admin panel;
- portal signup flow (создание портала + owner).

## Phase 2 - Auth Rewrite (2-3 недели)

- cookie-based auth/session для CRM/Web;
- tenant claims + session management;
- root owner protection logic.

## Phase 3 - Tenant Data Isolation (3-5 недель)

- добавить `portalId` в существующие сущности и мигрировать данные;
- mandatory filtering во всех query paths;
- аудит и тесты на cross-tenant leakage.

## Phase 4 - Dynamic Fields / Entities (4-8 недель)

- metadata tables + settings UI;
- dynamic form renderer (web/crm);
- backend schema validation engine;
- migration fixed DTO -> schema-driven validation.

## Phase 5 - Billing & Access Control (2-4 недели)

- Stripe checkout + webhooks + invoices;
- subscription status gates;
- billing pages для owner и platform admin.

## Phase 6 - CMS-lite + Domain + Integrations (4-8 недель)

- site content settings;
- custom domains + TLS automation;
- Telegram one-bot integration;
- embed widget for external websites.

---

## 16) Риски и как снизить

- **Риск утечки данных между порталами** -> tenant tests, query policies, code review checklist.
- **Сложность dynamic schema** -> начать с member fields, затем product/order/custom entities.
- **Сбой billing webhooks** -> идемпотентность + retry queue + reconciliation job.
- **Auth migration downtime** -> dual auth phase + feature flag + staged rollout.
- **Сложность custom domains** -> сначала только subdomain mode, потом custom domains.

---

## 17) MVP vs Full

## MVP (быстрый выход)

- multi-portal auth + isolation;
- portal signup + billing basic (active/past_due/suspended);
- fixed entities (member/product/order), но dynamic fields только для `member`;
- platform admin basic;
- slug routing без custom domains.

## Full SaaS target

- dynamic entities + stages;
- CMS-lite + custom domains;
- Telegram notifications;
- embedded registration SDK/widget.

---

## 18) Что делать первым делом прямо сейчас

1. Зафиксировать ADR по tenancy/auth/billing.
2. Ввести `portalId` как обязательный контекст в API (без этого дальше идти опасно).
3. Запустить platform admin + portal onboarding.
4. Вынести member registration на metadata-driven fields (первый вертикальный slice).
5. После этого масштабировать паттерн на product/order/другие сущности.

---

Этот документ - целевая карта. После согласования следующий шаг: разрезать по эпикам и задачам (`backend`, `crm`, `web`, `infra`, `billing`, `security`) с оценками и зависимостями.
