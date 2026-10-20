# События, realtime и уведомления — дизайн до кода

Дата: 2026-10-20. Ветка `main`, HEAD `6273822`. Детализирует TASK-780…782 из
[verticals-and-seo](verticals-and-seo.md) (раздел D) и добавляет транспорт realtime (TASK-794, 795),
которого там нет: сейчас фронт узнаёт об изменениях только после своей мутации или перезагрузки.
Нумерация продолжает TASK-793.

Повод (Вадим, 2026-10-20): участник стал «в клубе» — товары в кабинете появляются только после
перезагрузки; продавец сменил стадию заказа — у участника ничего не изменилось; таких кейсов будет
бесконечно, нужна система, а не точечные фиксы; плюс оповещения.

Что есть: TanStack Query v5 с `staleTime` 60 с и без `refetchOnWindowFocus`; опрос только у доступа к
магазину кабинета (30 с, `cabinet-shop.hook.ts`); BullMQ-очереди `mail`, `member-files`, `portal-events`;
`RedisService` на ioredis; `SessionsService.authenticate(token, audience)` — одна проверка сессии для
куки и Bearer. Сокетов, SSE и event-emitter нет.

---

## Принципы

1. **Одна шина.** Любое изменение, о котором должен узнать кто-то ещё, — доменное событие. Realtime,
   уведомления, журнал, вебхуки, Inbox — потребители. Сервис не шлёт письмо, не пишет журнал и не
   дёргает сокет сам.
2. **Outbox, не in-process.** Событие пишется в `domain_events` той же транзакцией, что и изменение.
   Упал процесс, лёг Redis — событие дойдёт позже, а не потеряется. Цена — одна таблица и релей.
3. **Контракт общий для API, CRM, кабинета и будущего RN-приложения** — пакет `packages/domain-events`.
   Имя события и форма payload — публичный API, с версией.
4. **Realtime несёт факт, не данные.** Клиент получает «заказ X перешёл в стадию Y» и перечитывает то,
   что ему нужно, через свои запросы (с правами, как обычно). Точечный патч кэша — оптимизация потом.
5. **Потребители идемпотентны, порядок — только внутри агрегата.** Повтор и перестановка не ломают.
6. **Деньги и персональные данные в payload не кладём** — только идентификаторы и статусы. Сумму
   заказа, номер документа, финансовые проводки получатель читает запросом по правам.

---

## Архитектура

```
use-case ──(tx)──► таблица domain_events ──► OutboxRelay (poll, SKIP LOCKED) ──► BullMQ `domain-events`
                                                                                      │
                             ┌────────────────────────────────────────────────────────┤ fan-out: job на пару
                             ▼                     ▼                    ▼             ▼   событие × потребитель
                    RealtimeConsumer       NotificationsConsumer   ActivityLog     Integrations/Webhooks
                     (socket.io rooms)      (TASK-781)             (TASK-782)       (позже)
                             │
                    CRM / кабинет / RN: RealtimeProvider → реестр «событие → queryKey» → invalidate
```

### Контракт события (`packages/domain-events`)

```ts
type DomainEvent<N extends EventName = EventName> = {
    id: string;              // uuid, ключ идемпотентности
    name: N;                 // '<aggregate>.<past_tense>': 'order.stage_changed'
    version: 1;              // форма payload; новая форма = новая версия, старую читают год
    portalId: string;
    occurredAt: string;      // ISO
    actor: { kind: "employee" | "member" | "system"; id: string | null };
    aggregate: { kind: "order" | "member" | "product" | …; id: string };
    payload: EventPayload[N]; // zod-схема в каталоге, без Prisma-типов
};
```

Каталог (`packages/domain-events/src/catalog/<module>.ts`) на каждое событие: схема payload,
`audience` для realtime (кому слать: `staff` с правом, `member` — по какому полю payload найти
участника), `publicPayload` — какие поля видит участник, описание для журнала.

События v1 (сверх списка TASK-780, здесь — те, что нужны сразу):

| Событие                                    | Агрегат      | Realtime кому                                                 | Зачем                                          |
| ------------------------------------------ | ------------ | ------------------------------------------------------------- | ---------------------------------------------- |
| `member.status_changed`                    | member       | staff `members.read`; сам участник                            | кабинет: магазин/QR появляются сразу           |
| `member.joined`, `member.consent_given`    | member       | staff                                                         | список участников, колокольчик                 |
| `order.placed`                             | order        | staff `orders.read`; участник                                 | канбан у персонала, «заказ принят» у участника |
| `order.stage_changed`, `order.cancelled`   | order        | staff; участник заказа                                        | обе стороны видят стадию                       |
| `order.payment_changed`                    | order        | staff; участник                                               | статус оплаты                                  |
| `product.changed`, `product.stock_changed` | product      | staff `products.read`; участники клуба (только `isAvailable`) | каталог без перезагрузки                       |
| `presence.entered`, `presence.left`        | presence     | staff; участник                                               | «в клубе» на стойке и в кабинете               |
| `employee.joined`, `role.changed`          | employee     | staff `employees.read`; сам сотрудник                         | права применяются сразу                        |
| `session.revoked`                          | session      | — (системное)                                                 | разорвать сокет отозванной сессии              |
| `notification.created`                     | notification | адресат                                                       | колокольчик и тост (TASK-781)                  |
| `finance.transaction_recorded`             | finance      | staff `finance.read` (без суммы)                              | отчёты перечитываются                          |

### Хранение

```
domain_events   id uuid pk, portal_id, name, version, aggregate_kind, aggregate_id,
                actor_kind, actor_id, payload jsonb, occurred_at, sequence bigserial,
                dispatched_at null       indexes: (dispatched_at) partial where null,
                                                  (portal_id, occurred_at), (aggregate_kind, aggregate_id)
event_deliveries event_id, consumer, delivered_at, error   pk (event_id, consumer)
```

Retention: `portal.plan` задаёт срок хранения (по умолчанию 365 дней), ночная уборка (cron как у
`disk-janitor`). Партиционирование — не раньше 10 M строк.

### Публикация

`DomainEventPublisher.publish(tx, event)` — только с `Prisma.TransactionClient`: сервис, который пишет
без транзакции, оборачивает запись и событие в `$transaction`. Сборка события — фабрики в модуле
агрегата (`orders/application/events/order-events.ts`), чтобы payload собирался в одном месте.
Первые точки: `OrderStagesService.applyStage`, `PlaceCabinetOrderUseCase`, `PlaceStaffOrderUseCase`,
`MembersService.updateMemberStatus`, `JoinPortalService`, `PresenceService` (вход/выход),
`ProductsService` (запись и склад), `SessionsService.revoke*`.

### Релей и потребители

- `OutboxRelayService`: `@Interval(500)`, `SELECT … WHERE dispatched_at IS NULL ORDER BY sequence LIMIT 100
FOR UPDATE SKIP LOCKED`, кладёт в очередь `domain-events` одну job на событие (`jobId =
buildJobId("evt", id)`), ставит `dispatched_at`. Несколько инстансов API безопасны.
- `DomainEventsProcessor`: по реестру потребителей делает fan-out — отдельная job на пару
  (событие, потребитель) с `jobId = buildJobId("evt", id, consumer)`; потребитель вызывается, успех
  пишется в `event_deliveries`; повтор с backoff 5 попыток, затем DLQ и алерт в Telegram
  (`TelegramService`).
- Потребитель — класс с методами `@OnDomainEvent("order.stage_changed")` (`DiscoveryService`
  собирает реестр на старте); имя потребителя — имя класса.

### Realtime (TASK-794)

Транспорт — **socket.io** на `@nestjs/websockets` + `@nestjs/platform-socket.io` (не SSE: нужен RN,
двусторонний канал для Inbox TASK-783/786, `@socket.io/redis-adapter` для нескольких инстансов).

- Namespaces `/crm` и `/cabinet` — по аудитории сессии. Handshake: токен из куки (`cookie`-заголовок
  рукопожатия, те же имена `crm_access` / `cabinet_access`) или `auth.token` (мобильные) →
  `SessionsService.authenticate`. Клуб — из `auth.portal` (slug), членство проверяется как в
  `MembershipGuard`; один сокет = один клуб, смена клуба = реконнект.
- Комнаты: `portal:{id}:staff`, `portal:{id}:employee:{id}`, `portal:{id}:member:{memberId}`,
  `user:{userId}` (кабинет без клуба: мои клубы, членства в ожидании).
- `RealtimeConsumer` — потребитель шины: по `audience` из каталога выбирает комнаты и `publicPayload`,
  шлёт одно сообщение `event` с конвертом `DomainEvent` (payload урезан для участника). Права сотрудника
  проверяются на входе в комнату `staff` по снимку прав; `role.changed` → пересчёт комнат; `session.revoked`
  → `disconnectSockets` по `sid`.
- Истечение access-токена: сервер разрывает в `exp`; клиент при `connect_error: unauthorized` делает
  refresh через существующий API-клиент и подключается снова.
- Конфиг: `REALTIME_ENABLED`, `REALTIME_PING_INTERVAL_MS`, `REALTIME_MAX_CONNECTIONS_PER_SESSION`; CORS —
  тот же `CORS_ORIGIN`; `/health` отдаёт число соединений. Traefik проксирует WebSocket без настройки;
  Cloudflare — тоже (проверить на проде: `wss://api.<domain>/crm`).
- e2e: auth по куке и Bearer, чужой клуб → отказ, сотрудник без права не получает событие, участник
  получает только свой заказ, разрыв при отзыве сессии.

### Фронт (TASK-795)

- `apps/crm/modules/shared/realtime/`: `RealtimeProvider` (socket.io-client, `withCredentials`, URL =
  `NEXT_PUBLIC_API_URL` + namespace по аудитории приложения), `useRealtimeEvent(name, handler)`,
  `useRealtimeStatus()` (индикатор «нет связи» в шапке).
- Реестр инвалидации: у каждой entity файл `realtime.ts` —
  `export const orderRealtime: RealtimeRule[] = [{ event: "order.stage_changed", keys: (e) =>
[orderKeys.detail(e.aggregate.id), orderKeys.lists()] }]`; провайдер собирает правила из
  `entities/*/index.ts`. Новый кейс = одна строка в реестре.
- Fallback: при реконнекте `invalidateQueries()` всего активного; при отсутствии соединения дольше
  `REALTIME_FALLBACK_POLL_MS` — `refetchInterval` для активных запросов. Опрос доступа к магазину (30 с)
  убирается.
- Кейсы приёмки: (1) персонал ставит участнику статус «в клубе» → в кабинете магазин и лимит без
  перезагрузки; (2) продавец двигает заказ по канбану → у участника список и карточка заказа
  обновились; (3) участник оформил заказ → на канбане персонала появилась карточка; (4) второй сотрудник
  видит перемещение карточки, сделанное первым; (5) отзыв сессии в «Вход и безопасность» → вкладка
  разлогинилась сразу.
- RN (TASK-792): тот же пакет контракта и те же правила реестра, socket.io-client с `auth.token`.

---

## Задачи

### TASK-780: шина событий с outbox `[x]` P0 — `feat/domain-events` (2026-10-20)

- [x] `packages/domain-events`: конверт, каталог v1 (17 событий), zod-схемы,
      `audience`/`publicPayload`, тесты каталога (vitest); собирается на `pnpm install` (postinstall)
- [x] Prisma: `domain_events`, `domain_event_deliveries` (миграция `20261020071235_domain_events`)
- [x] `apps/api/src/modules/events`: `DomainEventPublisher`, `OutboxRelayService`,
      `DomainEventsProcessor`, `@OnDomainEvent`, реестр потребителей, алерт в Telegram после 5 попыток
- [x] Публикация в транзакциях: заказы (оформление, стадия, отмена, оплата), участники (вступление,
      согласие, выход, статус, правка карточки — `MemberEditingService`), товары, присутствие (вход,
      выход, авто-выход крона), команда (вступление, роль/активность), основание клуба, отзыв сессий
- [x] Очередь `portal-events` удалена: письмо и алерт — потребители `portal.founded`
- [x] e2e `domain-events.e2e-spec.ts`: событие в транзакции, откат — события нет, чужой клуб — ни
      записи, ни события, релей и повтор доставки идемпотентны; unit — публикатор, реестр, релей, воркер
- [x] [DOMAIN_EVENTS](../backend/DOMAIN_EVENTS.md): контракт, мультитенантность, как добавить событие
- [ ] Не покрыто событиями: перестановка карточки внутри колонки канбана, документы участника,
      права роли (`role.changed`, нужно шлюзу TASK-794), записи EAV (`record.updated`, TASK-782)

### TASK-794: realtime-шлюз `[ ]` P0

- [ ] socket.io gateway `/crm`, `/cabinet`, auth по сессии, комнаты, Redis-adapter
- [ ] `RealtimeConsumer`: аудитория и урезанный payload по каталогу; `session.revoked` → разрыв;
      `role.changed` → пересбор комнат
- [ ] Конфиг и лимиты, `/health`, CORS; проверка через Traefik + Cloudflare на проде
- [ ] e2e gateway (список выше)

### TASK-795: realtime на фронте `[ ]` P0

- [ ] `shared/realtime`: провайдер, хуки, индикатор связи, refresh при `unauthorized`
- [ ] Реестр правил для `order`, `cabinet-order`, `cabinet-shop`, `cabinet-club`, `member`,
      `membership`, `product`, `presence`, `employee`, `access`
- [ ] Снять опрос магазина; fallback-опрос при разрыве
- [ ] Пять кейсов приёмки руками (Chrome, две сессии: CRM + кабинет)

### TASK-781: уведомления `[ ]` P0 — по verticals-and-seo, уточнения

- [ ] Потребитель шины; правила декларативно рядом с каталогом (`rules.ts`), тексты — i18n-ключи +
      параметры, сам текст рендерится на клиенте по локали получателя
- [ ] Каналы: in-app (запись + событие `notification.created` → realtime: колокольчик и тост Sonner),
      mail (очередь `mail`), Telegram (участники с Telegram-входом — chat id уже есть), push — при RN
- [ ] Предпочтения: получатель × тип × канал; «тихие часы» портала; дедупликация по (получатель, тип,
      агрегат, окно)
- [ ] Первые правила: `order.placed` → персонал с `orders.read`; `order.stage_changed` (готов к выдаче,
      выдан, отменён) → участник; `member.joined`/`consent_given` → персонал; `member.status_changed`
      (в клубе) → участник; `product.stock_changed` ниже `minQuantity` → персонал с `products.write`;
      финансы: превышение плана расходов (см. [finance-accounting](finance-accounting.md))
- [ ] UI: колокольчик в шапке CRM (`crm-shell`) и кабинета (`member-shell`), список с «прочитано»,
      настройки каналов в профиле

### TASK-782: журнал — проекция событий `[ ]` P0 — без изменений

---

## Порядок

780 → 794 → 795 (видимый результат: оба кейса Вадима) → 781 → 782. Finance (отдельный план) садится на
ту же шину: проводки — события, превышение плана — уведомление.

Зависимости и риски: `@nestjs/websockets` тянет socket.io в образ API (+~1 MB); адаптер Redis
использует второе соединение ioredis (pub/sub) — вынести в `RedisService.duplicate()`; на Windows в dev
сокеты работают, но Next dev-прокси не используем — клиент идёт прямо на `NEXT_PUBLIC_API_URL`.
