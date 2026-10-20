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

### TASK-794: realtime-шлюз `[x]` P0 — `feat/realtime` (2026-10-20), [REALTIME](../backend/REALTIME.md)

- [x] socket.io `/crm`, `/cabinet` только по WebSocket, рукопожатие по сессии (кука или Bearer) и
      членству (общие `findActiveEmployee` / `findActiveMember` с MembershipGuard), Redis-адаптер в main.ts
- [x] Origin для соединения на куке — фронт своего приложения (`audienceOrigins`), кука одного
      приложения не читается в неймспейсе другого
- [x] `RealtimeConsumer`: комнаты `portal:<id>:…` по аудитории каталога, участнику — `publicPayload`;
      разрыв при `session.revoked`, `employee.access_changed`, `role.changed` (новое событие),
      `member.left`, отключении участника; срок access-токена закрывает соединение
- [x] e2e `realtime.e2e-spec.ts` (11): отказы рукопожатия, права, чужой клуб, чужой заказ, публичные
      поля, разрыв при отзыве сессии и смене прав роли; unit на правила комнат
- [ ] Проверка через Traefik + Cloudflare на проде (`wss://api.<домен>/socket.io`); лимит соединений
      на сессию; число соединений в `/health`

### TASK-795: realtime на фронте `[x]` P0 — `feat/realtime` (2026-10-20)

- [x] `shared/realtime`: `RealtimeConnection`, провайдер, `useRealtimeEvent`, `useRealtimeStatus`,
      значок «нет связи» в шапках CRM и кабинета, refresh тем же помощником, что у API-клиента
- [x] Правила `entities/<x>/realtime.ts` для `order`, `member`, `product`, `presence`, `employee`,
      `access`, `cabinet-order`, `cabinet-shop`, `cabinet-club`, `membership`; списки — в
      `processes/realtime/realtime-rules.ts`
- [x] Опрос магазина (30 с) снят; без связи активные запросы перечитываются раз в 30 с
- [x] Живая проверка (headless Chrome, стенд на lvh.me): участника отметили на входе — витрина
      открылась за 0,6 с; заказ сотрудника появился в кабинете за 0,3 с, смена стадии — за 0,3 с;
      заказ участника из кабинета появился в списке CRM за 0,3 с

### TASK-781: уведомления `[x]` P0 — первая версия 2026-10-20 (заказы)

Вадим 2026-10-20: «оповещения по заказам очень нужны» — первыми идут правила заказов.

- [x] Потребитель шины `OrderNotificationsConsumer`, правила — `notifications/domain/order-notification-rules.ts`:
      заказ из кабинета и отмена участником → персоналу с `orders.read`; смена стадии сотрудником и
      отмена клубом → участнику. Заказ на стойке никого не уведомляет
- [x] Хранение: `notifications` (адресат — сотрудник или участник клуба, `type` + `params` без
      персональных данных, `read_at`), уникальность (событие, адресат) — повтор доставки не дублирует
- [x] Каналы: in-app (событие `notification.created` с аудиторией `employee` / `member` → колокольчик и
      тост Sonner), Telegram — ботом кабинета участнику и ботом CRM сотруднику, только тем, кто входил
      через Telegram (право писать дано при входе), отдельным потребителем
- [x] Предпочтения: канал Telegram аккаунта (`notification_preferences`), переключатель в колокольчике
- [x] UI: колокольчик в шапке CRM (заказ — в слайдере) и кабинета клуба (страница заказа); ru/en/es
- [ ] Дальше: почта как канал, «тихие часы», правила `member.joined` / `consent_given`, низкий остаток
      товара, превышение плана расходов (TASK-800); колокольчик на главной кабинета по всем клубам

### TASK-782: таймлайн сущности — история и комментарии `[x]` P0 — 2026-10-20

Вадим 2026-10-20: «цепочки событий по сущностям: карточку шире, таймлайн во всю высоту до
статистики, свой комментарий можно добавить и закрепить».

- [x] История = чтение `domain_events` по агрегату (`aggregate_kind`, `aggregate_id`) с рендером из
      каталога: i18n-ключ по имени события и параметры из payload; отдельной `ActivityLog` нет. Права —
      как у realtime: строку видит тот, кому её отдал бы `audience` события
- [x] Комментарии: таблица `entity_comments` (portal_id, aggregate_kind, aggregate_id, author_employee_id,
      body, pinned_at, pinned_by, edited_at, deleted_at, created_at); события `comment.added / edited /
      pinned / deleted` — таймлайн и лента обновляются у всех. Закреплённые — сверху таймлайна. Текст —
      внутренняя заметка персонала, участнику не виден
- [x] Общий виджет `EntityTimeline` (история + комментарии, поле ввода, закрепить, фильтр «только
      комментарии»): карточки участника, заказа и сотрудника (товар — когда появится его карточка); бесконечная прокрутка по курсору
      (`occurred_at`, id)
- [x] Карточка: слайдер шире (1400 px), таймлайн занимает всю высоту до блока статистики; на телефоне — вкладкой
- [x] Источники таймлайна: участник — события, где `payload.memberId` = его id (вход, визиты, заказы,
      статус, согласие); заказ, сотрудник, товар — события своего агрегата. История до 2026-10-20 (событий
      ещё не было) — из записей, как сейчас в карточке участника; дубли тех же видов из событий скрываются
- [x] Имена в событиях — при чтении: автор-сотрудник, стадия заказа, статус участника; индекс по
      `payload->>'memberId'` — когда событий клуба станет больше сотен тысяч
- [ ] Diff для записей EAV: событие `record.updated` несёт `changes: { field, from, to }[]`
- [ ] «Журнал» в настройках с фильтрами по сущности, сотруднику и дате; журнал доступа к документам —
      те же события; retention по тарифу; экспорт CSV

### TASK-808: лента CRM — события клуба как лента соцсети `[x]` P0 — 2026-10-20

Вадим 2026-10-20: «в sidebar первым пунктом — лента: все события, заказы, комменты, коммуникации,
изменения статусов заказов, фильтр, писать прямо в ленте».

- [x] Пункт «Лента» первым в меню CRM (`processes/navigation/crm/data.tsx`), маршрут `/crm/feed`
- [x] Лента = события портала (как таймлайн TASK-782, но без фильтра по агрегату) + комментарии + посты:
      пост — комментарий без сущности (`aggregate_kind = portal`), можно упомянуть участника или заказ;
      карточка события ведёт в слайдер сущности
- [x] Фильтры: разделы (заказы, участники, визиты, записи команды, команда, товары, финансы) и «только мои»;
      [ ] выбор сотрудника и период — следующим шагом
- [x] Новое — кнопкой «Новых записей: N» по realtime, без прыжка прокрутки
- [x] Права: событие видно по `audience` (заказы — `orders.read`, финансы — `finance.read`); мультитенантность —
      только портал сотрудника; e2e: менеджер без финансов не видит финансовых событий, чужой клуб — ничего
- [ ] Коммуникации — по мере появления: кнопки «написать» (`contact.messaged`, TASK-783 ступень 0), затем Inbox

---

## Порядок

780 → 794 → 795 (видимый результат: оба кейса Вадима) → 781 → 782 → 808. Finance (отдельный план)
садится на ту же шину: проводки — события, превышение плана — уведомление. С 2026-10-20: после TASK-797
финансов идут 781 (уведомления по заказам), 782 и 808, затем финансы с TASK-798.

Зависимости и риски: `@nestjs/websockets` тянет socket.io в образ API (+~1 MB); адаптер Redis
использует второе соединение ioredis (pub/sub) — вынести в `RedisService.duplicate()`; на Windows в dev
сокеты работают, но Next dev-прокси не используем — клиент идёт прямо на `NEXT_PUBLIC_API_URL`.
