# Аудит безопасности: план задач

Дата аудита: 2026-08-29. Ветка: `fix/security-audit`.
Проверено по коду `main` после TASK-104, инвентаризация маршрутов — по OpenAPI **работающего** API
(124 маршрута), а не по исходникам: закомментированная регистрация контроллера в исходниках
выглядит как живая дыра, хотя маршрута нет.

Смежное: [multitenant](./multitenant.md), [scaling-roadmap](./scaling-roadmap.md),
[контракт HTTP API](../backend/HTTP_API_CONTRACT.md).

---

## Легенда статусов

- `[ ]` — не начато
- `[~]` — в процессе / частично
- `[x]` — завершено

---

## Что проверялось

| Плоскость | Метод | Итог |
|---|---|---|
| Аутентификация на каждом маршруте | инвентаризация 124 живых маршрутов из OpenAPI + гварды в контроллерах | 1 дыра (TASK-301), 1 мёртвый контроллер (TASK-305) |
| Скоуп портала в репозиториях | все `*prisma.repository.ts` на упоминание `portalId` | 1 дыра (TASK-302) |
| IDOR: выборка по id без владельца | `findUnique({ where: { id } })` по репозиториям | чисто, кроме TASK-302 |
| Гвард навешен, но не работает | `@UseGuards(AdminGuard)` без `@Admin()` — грабли TASK-023 | чисто: гвард fail-closed с TASK-023 |
| Rate limiting | поиск throttler/лимитов | отсутствовал полностью (TASK-304) |
| Реальный IP за прокси | `trust proxy` в приложении vs `X-Forwarded-For` в nginx | не настроен (TASK-304) |
| Утечка секретов в ответах | `password`/хеши в DTO и мапперах | чисто: хеш только во входных DTO |
| Энтропия токенов | генерация токенов верификации, сброса, приглашений, ссылок | чисто: `randomBytes(24…32)`, `Math.random` в безопасности нет |
| Энумерация пользователей | ответ `password/reset/request` для существующего и несуществующего email | чисто: ответ одинаковый |
| Инвалидация сессий | отзыв refresh при смене пароля | не было (TASK-303) |
| SQL-инъекции | все `$queryRaw`/`$executeRaw` | чисто: только теговые шаблоны, `*Unsafe` не используется |
| Уязвимости зависимостей | `pnpm audit` | 220 advisories (TASK-306) |
| Загрузка файлов (2026-09-02) | три пути загрузки, превью, `S3Service`, потолки тела | тип и размер не проверялись, объекты не удалялись (TASK-309) |
| Формат ошибок и whitelist (2026-09-05) | фильтр и пайп по коду vs доки; все 104 вызова `$api.*` в crm/web/admin против DTO | фильтр не зарегистрирован, строгий режим выключен, `domain` в логине (TASK-308, TASK-310) |

---

## Закрытые задачи

### TASK-301: открытый почтовый релей `[x]` (2026-08-29)

`POST /mail/send` — **боевой маршрут без единого гварда**. Подтверждено по OpenAPI работающего API,
а не только по исходникам. Маршрут `/mail` не начинается с `/crm/`, `/lk/`, `/users/`, `/public/`,
поэтому `PortalContextMiddleware` его пропускал — портал даже не требовался.

DTO принимал произвольного получателя, тему и `body`, который уходил в `html:` без экранирования.
Кто дотянулся до API — рассылал любой HTML-мейл кому угодно через SMTP проекта: фишинг с домена
клуба, спам-релей и сожжённая репутация отправителя.

- [x] `MailController` и его DTO удалены: маршрут не звал ни один фронт, а легитимная отправка
      идёт через `MailProcessor` из очереди `mail`
- [x] `controllers: [MailController]` убран из `MailModule`

### TASK-302: кросс-портальный справочник единиц измерения `[x]` (2026-08-29)

`MeasurementUnit` — единственная бизнес-таблица без `portalId`, при этом
`POST/PATCH/DELETE /crm/catalog/measurement-units` были открыты админу **любого** портала.
Три следствия:

- админ клуба A переименовывал, деактивировал и удалял единицу, на которую ссылаются
  товары клуба B;
- `code` уникален глобально, поэтому занятый клубом A код не давал клубу B завести свой —
  это уже был видимый баг, а не только дыра;
- `ProductsService` проверял `measurementUnitId` по общей таблице, то есть товар клуба A
  мог сослаться на единицу клуба B.

- [x] `portalId` на `MeasurementUnit`, `@@unique([portalId, code])`, каскад от портала —
      ровно как у соседней `ProductCategory`
- [x] Миграция `20260829160000_measurement_unit_portal_scope`
- [x] `portalId` — обязательный первый аргумент каждого метода репозитория (правило TASK-103a).
      `findById` через `findFirst({ id, portalId })`, запись через `updateMany`/`deleteMany`
      с порталом в условии: `update` по одному id правил бы чужую строку
- [x] `ProductsService` проверяет единицу в своём портале
- [x] e2e: 5 кейсов в `tenant-isolation.e2e-spec.ts` — чужая единица не видна в списке,
      не правится, не удаляется, товар не может на неё сослаться, и оба клуба спокойно
      заводят **один и тот же код**

**Первая попытка была неверной.** Сначала запись подняли на уровень платформы, оставив
клубам чтение: справочник выглядел общим, ничем не сидился, и миграция казалась лишним
риском. Проверка потребителей показала обратное — в CRM есть живой виджет управления
единицами (`measurement-unit-management-widget.tsx`), то есть клубы заводят свои единицы,
и платформенный вариант отнимал рабочую функцию. Вывод на будущее: искать потребителей
эндпоинта **до** того, как его убирать, а не после.

### TASK-303: смена пароля не выкидывала чужие сессии `[x]` (2026-08-29)

`resetPassword` менял хеш и гасил токен сброса, но refresh-токены оставались активными.
Если аккаунт угнали, сброс пароля ничего не давал: refresh злоумышленника жил ещё 7 дней и
молча выписывал новые access-токены.

- [x] `RefreshTokenRepository.revokeAllForUser(userId)` — отзыв всех активных refresh аккаунта
- [x] Вызывается в `resetPassword` после смены хеша
- [x] Без фильтра по `principalType`: member- и employee-мосты делят один глобальный аккаунт,
      и пароль у них общий

Существовавший `revokeAllActiveForUserDevice` отзывал только по устройству — для смены пароля
этого мало по определению.

### TASK-304: rate limiting и реальный IP за прокси `[x]` (2026-08-29)

Лимитов не было **нигде**. Открыты были подбор пароля на трёх логинах, перебор публичных токенов
приглашений и регистрационных ссылок и, отдельно неприятное, `POST /auth/password/reset/request` —
каждый вызов отправляет письмо, то есть рассылка с нашего SMTP без единого ограничения.

- [x] `@nestjs/throttler`, глобальный `ThrottlerGuard` через `APP_GUARD`
- [x] Наборы лимитов в `common/config/throttler/throttler.config.ts`, все переопределяются env:
      `default` 300/мин, `auth` 20/мин, `email` 5/мин, `public-token` 30/мин, `signup` 10/мин
- [x] `@Throttle` навешен точечно: логины и refresh, верификация и сброс пароля, публичные
      токен-маршруты, регистрация участника/сотрудника/портала
- [x] **`trust proxy`** в `main.ts` (`TRUST_PROXY_HOPS`, по умолчанию 1). nginx из `infra/`
      прокидывает `X-Forwarded-For`, но приложение прокси не доверяло — любой лимит склеивал
      всех клиентов в один IP. Значение больше фактического числа хопов позволило бы клиенту
      подделать свой IP заголовком и лимит обойти, поэтому это число хопов, а не `true`
- [x] e2e: `test/rate-limit.e2e-spec.ts` — лимит срабатывает на сбросе пароля и на подборе
      пароля, при этом первый запрос проходит и `/health` не режется

### TASK-305: мёртвый контроллер глобальных аккаунтов `[x]` (2026-08-29)

`UsersController` давал CRUD по **глобальному** аккаунту под `@RequireEmployeeAdmin()`:
`PATCH /users/:id` менял пароль любому аккаунту в системе, `DELETE` сносил его каскадом вместе
с Member/Employee во всех порталах, и ничто не проверяло, что целевой user вообще относится
к порталу вызывающего.

**Живой дырой это не было**: в `UsersModule` регистрация закомментирована
(`// controllers: [UsersController]`), и OpenAPI работающего API маршрутов `/users/*` не отдаёт.
Но это заряженное ружьё: одна раскомментированная строка отдавала админу любого клуба захват
любого аккаунта, включая владельцев других клубов.

- [x] Контроллер, его спека и неиспользуемый `UserQueryDto` удалены
- [x] Закомментированная строка регистрации убрана из `UsersModule`
- [x] `UsersService` и репозиторий остались: их используют auth, приглашения, регистрационные
      ссылки, участники и сотрудники

### TASK-309: загрузка файлов `[x]` (2026-09-02, ветка `fix/upload-security`)

Три пути, по которым файл попадает в аккаунт: `POST /lk/account/documents` и
`PUT /lk/account/signature` (base64 в JSON), `POST /lk/auth/member/files` (base64 в JSON →
очередь `member-files`), `PATCH /crm/members/:id/files` (multipart). Плюс два превью для CRM.

**Что было.**

- **Тип файла — со слов клиента.** MIME брался из префикса data URL или из `mimetype` multer,
  содержимое не проверялось. Всё, что не попадало в карту расширений, ложилось в бакет как
  `.bin` и отдавалось превью как `application/octet-stream` — это спасало от исполнения HTML,
  но HTML с заявкой `image/png` уходил в бакет под именем `.png`.
- **Размера не было нигде.** JSON-пути упирались в штатный потолок Nest **100 КБ** — случайно,
  потому что никто его не выставлял, и это был функциональный баг: фото паспорта с телефона
  (2–6 МБ) через `/lk/account/documents` давало 413. `FileFieldsInterceptor` в CRM шёл без
  `limits`: multer читал файл любого размера в память.
- **Мусор уходил в Redis.** `POST /lk/auth/member/files` клал base64 в очередь без проверки;
  невалидный файл падал уже в воркере, клиент получал `queued: true`, а `removeOnFail: false`
  оставлял мегабайты base64 в Redis навсегда.
- **Объекты не удалялись.** Замена документа перезаписывала `storagePath`, удаление документа
  удаляло только строку: в приватном бакете копились все версии удостоверений личности —
  для продукта, который продаёт RGPD-compliance, это находка не только про место.
- **Тип документа — свободная строка** без длины, а пары (тип, сторона) без потолка: один
  аккаунт мог заводить объекты в бакете без ограничений.
- `S3Service.uploadFile` — мёртвый метод с расширением из `originalname` клиента и
  `ACL: public-read`: не вызывался, но ждал своего часа.

**Что сделано.**

- [x] `common/upload`: тип определяется **по сигнатуре** (JPEG, PNG, WebP, PDF), заявленный MIME
      не участвует; расширение в бакете и `Content-Type` превью — от сигнатуры. Документ —
      изображение или PDF, подпись — только изображение
- [x] Лимиты на файл: документ 8 МБ, подпись 2 МБ, не больше 10 документов на аккаунт —
      `UPLOAD_MAX_DOCUMENT_MB`, `UPLOAD_MAX_SIGNATURE_MB`, `UPLOAD_MAX_DOCUMENTS_PER_ACCOUNT`
- [x] `AccountFilesService` — единственный путь файла в аккаунт: проверка → приватный бакет →
      строка → удаление прежнего объекта. Строка не записалась — новый объект удаляется;
      удаление прежнего не удалось — только лог, загрузка не откатывается. `deleteDocument`
      удаляет и объект. Оба других модуля (воркер очереди, CRM) больше не пишут в репозитории
      документов напрямую
- [x] Потолок тела **по маршрутам**, а не один на всё: 25 МБ (два документа + подпись в
      base64, ровно `client_max_body_size` nginx) на трёх маршрутах загрузки и 1 МБ на всём
      остальном. Штатный парсер Nest выключен (`bodyParser: false`), парсеры регистрирует
      `AppModule` через `common/config/body-parser`. Потолок загрузки **считается** от лимитов
      на файл, чтобы не разойтись с ними при переопределении через env
- [x] multer: `limits.fileSize` = лимит документа, `files: 3`, `fields: 4` → 413 вместо
      съеденной памяти; поверх — та же проверка содержимого
- [x] Очередь: содержимое проверяется **до** `queue.add` — клиент получает 400 сразу;
      `attempts: 3` с backoff, `removeOnFail: { age: 24h, count: 100 }`
- [x] Превью: `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`,
      `Content-Disposition: inline` с именем объекта; неизвестное расширение — `attachment`
- [x] `@Throttle(UPLOAD_THROTTLE)` — 20/мин на четырёх маршрутах загрузки
- [x] `documentType` — `@MaxLength(50)` в обоих DTO, поля data URL — `@Matches` на префикс
- [x] `S3Service.uploadFile` удалён; `uuid` (ESM-only, ломал jest) заменён на `crypto.randomUUID`
      и выкинут из зависимостей вместе с jest-моком
- [x] unit: `common/upload/__tests__/upload-validation.spec.ts`,
      `account/__tests__/account-files.service.spec.ts`; e2e: `test/uploads.e2e-spec.ts` —
      12 кейсов: HTML под видом PNG, PDF как подпись, лимиты по виду файла, 413 на маршруте
      загрузки и 413 на 2 МБ JSON вне его, синхронный отказ до очереди, multer

**Что осталось за кадром и почему.** Успешная загрузка в e2e не проверяется — она упирается
в живой S3; логика замены и очистки покрыта unit-тестами на моках. Приватность бакета — вопрос
инфраструктуры: код кладёт документы без ACL, а `getPublicUrl` используется только для
`StorageType.PUBLIC`, которого сейчас никто не пишет; на бакете должен стоять Block Public
Access. Очередь для `/lk/auth/member/files` оставлена как есть: с проверкой до `add` она уже не
принимает мусор, а переводить маршрут в синхронный — отдельное решение о контракте с фронтом.

### TASK-308: `forbidNonWhitelisted` расходится с документацией `[x]` (2026-09-05, ветка `fix/exception-filter-contract`)

Включён `forbidNonWhitelisted: true` — как обещали `CLAUDE.md` и контракт. Пайп переехал из
`main.ts` в `AppModule` (`APP_PIPE`, `common/config/validation`): раньше каждая e2e-сьюта
ставила свой `ValidationPipe({ whitelist: true })` без строгого режима, и прогон тестов
проверял не ту конфигурацию, что крутится в проде.

**Что сломалось бы при простом переключении флага.**

- **Два `@Query()` DTO на одном хендлере.** Все пять списков (`/crm/orders`, `/lk/orders`,
  `/crm/presence/sessions`, `/crm/finance/transactions`, `/crm/catalog/products`) принимали
  `PaginationDto` и `XxxFilterDto` отдельными параметрами. Каждый DTO валидируется против
  всего query, так что `page` отвергал бы `status`, а `status` — `page`: 400 на любой запрос
  списка. Заменено на один `XxxListQueryDto extends IntersectionType(PaginationDto, XxxFilterDto)`.
- **`/crm/employees`** — `PaginationDto` плюс сырые `@Query("role")` / `@Query("isActive")`
  с ручным разбором; невалидная роль молча игнорировалась. Теперь `EmployeeListQueryDto`,
  невалидная роль — 400. Boolean из query-string — через `Transform`, а не `Type(() => Boolean)`
  (`Boolean("false") === true`).
- **Фронты.** Аудит всех 104 вызовов `$api.*` в crm/web/admin: единственное живое лишнее поле —
  `domain` в теле `POST /crm/auth/login` (crm и admin); портал и так едет заголовком
  `X-Portal-Slug`. Убрано. Тип `UpdateEmployeePayload` в CRM обещал `position` / `department`,
  которых нет в `UpdateEmployeeDto`, — приведён к DTO. TypeScript здесь не защищает:
  openapi-fetch типизирует body через mapped type, и лишнее свойство в литерале проходит `tsc`.

**Замечено попутно, исправлено вторым коммитом.**

- `ReportPeriodDto` требует непустые даты, а виджеты сводки и отчёта по типам в CRM без фильтра
  слали `startDate=&endDate=` — оба виджета получали 400 и молча рендерили пустоту. Теперь
  без явного периода фронт подставляет текущий месяц и подписывает это в карточках.
- `isActive` в `PresenceFilterDto` и `ProductFilterDto` шёл через `@Type(() => Boolean)`:
  `isActive=false` превращался в `true`. Общий `@IsQueryBoolean()`
  (`common/decorators/dto`) разбирает `"true"`/`"false"`, остальное — 400; e2e проверяет,
  что `isActive=false` действительно фильтрует.

- [x] `forbidNonWhitelisted: true`, пайп в `AppModule`, e2e-сьюты без своих пайпов
- [x] списки — один query DTO, `/crm/employees` — типизированные фильтры
- [x] фронты: `domain` из логина убран, `UpdateEmployeePayload` по DTO
- [x] e2e `error-contract.e2e-spec.ts`: лишнее поле тела и query → 400 с именем поля, списки
      с пагинацией и фильтром → 200, невалидная роль → 400

### TASK-310: `GlobalExceptionFilter` не зарегистрирован `[x]` (2026-09-05, ветка `fix/exception-filter-contract`)

Фильтр зарегистрирован через `APP_FILTER` в `AppModule` и переписан под контракт
`{ message, errors }`:

- **Валидация** — только когда `message` в ответе исключения массив (так кладёт
  `ValidationPipe`): `Validation failed` + `errors`. Прежний фильтр считал валидацией любой
  `BadRequestException` и для `throw new BadRequestException("File type not supported")`
  отдал бы `message: "Validation failed", errors: "File type…"` — строку вместо массива и
  сломанные проверки `res.body.message` в e2e загрузок.
- **Ошибки body-parser** (413 `entity.too.large`, 400 `entity.parse.failed`) — не
  `HttpException`, а `http-errors` со `statusCode` в объекте. Прежний фильтр отдал бы на них
  500. Теперь статус и текст берутся из ошибки.
- **500 без деталей.** Прежний фильтр отдавал клиенту `error.message` любого исключения —
  текст ошибки Prisma с именами таблиц, адрес БД из `ECONNREFUSED`. Теперь
  `Internal server error`, подробности и stack — в лог.
- **Дополнительные поля объектного ответа** (`checks` у `GET /health/ready`) сохраняются,
  служебные `statusCode` / `error` Nest — нет.
- **Лог**: 5xx — error со stack, 400 с нарушениями — warn одной строкой, остальные 4xx —
  debug. Прежний фильтр на каждый 401 писал многострочный error с разбором stack trace.
- `errors` теперь всегда массив (пустой, если деталей нет) — клиентам не нужно различать
  «нет поля» и «пустой список».

- [x] `APP_FILTER` в `AppModule`, юнит-тесты фильтра (7 кейсов)
- [x] e2e `error-contract.e2e-spec.ts`: 400/401/404/413 и битый JSON — один формат, без `statusCode`
- [x] доки: `HTTP_API_CONTRACT.md`, `backend/README.md`, `CLAUDE.md`, `MODULE_DEVELOPMENT_PRINCIPLES.md`

### TASK-306: уязвимости зависимостей `[x]` (2026-09-05, ветка `fix/exception-filter-contract`)

На старте `pnpm audit` давал **230** advisories (3 critical, 104 high), из них 61 — через
`@nestjs-modules/mailer`. Разбиралось только то, что доезжает до рантайма; dev-цепочки
(`@nestjs/cli`, `eslint`, `turbo`, `prisma`, `react-email` preview) не трогались.

**Что сделано.**

- **`@nestjs-modules/mailer` удалён.** Письма рендерит React Email, обёртка лишь передавала
  html в nodemailer, а тянула `handlebars` (critical, JS injection), `liquidjs` (critical, RCE),
  `mjml` → `html-minifier` (ReDoS), `preview-email` со своим старым `nodemailer@7`.
  Вместо неё — `MailTransport` (domain-интерфейс) и `SmtpMailTransport` на голом `nodemailer`
  в `modules/mail/infrastructure/transport`; `MailService` зависит от интерфейса и тестируется
  фейковым транспортом. Попутно: `MailService` больше не пишет в лог всё письмо целиком —
  в html лежат ссылки с токенами подтверждения и сброса пароля, теперь в логе только адресат
  и тема.
- `nodemailer` 8.0.1 → 10.0.0: в 8.x — SMTP command injection через `envelope.size` и CRLF
  в `name` (исправлено с 8.0.5), а в 8.0.11 ещё и обход `disableFileAccess`/`disableUrlAccess`
  через message-level `raw` (исправлено с 9.0.1). У 10.x типы встроены, `@types/nodemailer`
  не нужен; подпути `nodemailer/lib/*` заменены на именованные экспорты главного модуля.
- `bull@4` (старая библиотека очередей, тянула `lodash` 4.17.21 с code injection и `uuid` 8)
  удалён: в коде ни одного импорта, очереди давно на `bullmq`.
- `qs` 6.14.2 → 6.16.0 и `body-parser` 2.2.2 → 2.3.0 под express 5 (DoS в `qs.stringify`
  и обход array-limit; body-parser молча отключал лимит при невалидном значении) —
  `pnpm update --depth Infinity`, диапазоны express это допускают.
- **Nest 11.1.13 → 11.2.3** (`common`, `core`, `platform-express`, `testing`, `bullmq`):
  приносит `multer` 2.0.2 → 2.2.0 (три DoS: incomplete cleanup, resource exhaustion,
  uncontrolled recursion — доезжало через `PATCH /crm/members/:id/files`) и `path-to-regexp`
  8.3.0 → 8.4.2 (ReDoS в роутинге). Overrides не понадобились.
- `@nestjs/swagger` 11.2.6 → 11.4.7 (свой `path-to-regexp`), `@nestjs/config` 4.0.3 → 4.0.4
  (`lodash` 4.18, code injection в `_.template`), `@aws-sdk/client-s3` → 3.1127 (`fast-xml-parser`),
  `@nestjs/schedule` → 6.1.3.
- **`next` 16.1.6 → 16.3.4** во всех трёх фронтах. 16.1.7 закрывал request smuggling и DoS
  в Server Components, но **обход middleware через segment-prefetch маршруты** (high) исправлен
  только в 16.2.6 — а именно `apps/crm/middleware.ts` и `apps/web/proxy.ts` держат
  edge-защиту. Заодно `sharp` (CVE libvips) — у 16.3 диапазон `^0.35.4`.
  `next-intl` 4.8.3 → 4.14.2 (open redirect, prototype pollution через каталог переводов).
  Сборки crm/web/admin на новом next проходят.
- `axios` 1.13.5 → 1.20.0 в `api-client`, crm, web, admin: 29 advisories (SSRF через
  NO_PROXY, prototype pollution в merge конфига, header injection, утечка
  `Proxy-Authorization` на редиректе). Реально axios использует только
  `apps/web/modules/shared/lib/api.ts` — экземпляр без единого потребителя; сама зависимость
  во всех четырёх пакетах — кандидат на удаление.

**Итог `pnpm audit`:** 230 → 151 advisories (critical 3 → 2, high 104 → 72). В цепочках,
доезжающих до рантайма, остался один moderate — `uuid@11.1.0` под `bullmq` (bounds check
в v3/v5/v6 при переданном `buf`; bullmq использует v4). Всё остальное — dev-инструменты:
оба critical — `handlebars` под `ts-jest`/`@turbo/gen` и `basic-ftp` под `@turbo/gen`;
дальше `react-email` preview (minimatch, ajv, fast-uri, socket.io), `@nestjs/cli`, `eslint`,
`turbo`, `prisma`, `@parcel/watcher` из next-intl.

**Осталось / решить.**

- [ ] `tls.rejectUnauthorized: false` в SMTP-конфиге унаследован как есть: сертификат
      почтового сервера не проверяется. Включать строгую проверку — зависит от провайдера,
      решение за Вадимом (`common/config/mail/mailer.config.ts`).
- [ ] Удалить `axios` из `api-client`, crm, admin и мёртвый `apps/web/modules/shared/lib/api.ts`.
- [ ] `react-email` / `@react-email/preview-server` (dev) тянут minimatch/ajv/socket.io с
      advisories; в рантайме не живут — обновить при следующем касании шаблонов.

---

## Открытые задачи

### TASK-307: security-заголовки `[ ]`

- [ ] `helmet` не подключён. API отдаёт JSON и стоит за nginx, поэтому приоритет невысокий,
      но `X-Content-Type-Options`, `Referrer-Policy` и запрет кэша на auth-ответах стоит выставить
- [ ] Решить, где им место: в приложении или в шаблоне nginx (`infra/docker/nginx/templates`)

---

## Что проверено и оказалось в порядке

Фиксирую отдельно, чтобы следующий аудит не перепроверял то же самое.

- **Скоуп портала.** После TASK-103a все репозитории, кроме единиц измерения, фильтруют по
  `portalId`. Нескоупленных выборок по id не осталось
- **`AdminGuard` fail-closed** с TASK-023: `@UseGuards(AdminGuard)` без `@Admin()` встречается
  в восьми местах, но роль проверяется всегда. Это расхождение в стиле, а не дыра;
  предпочтительная форма — `@RequireAdmin()`
- **Токены** генерируются `randomBytes(24…32)`, `Math.random` в безопасности нет
- **Сброс пароля** не раскрывает существование email, токен живёт час и гасится после
  использования
- **SQL-инъекций нет**: все четыре raw-запроса — теговые шаблоны с `Prisma.sql`,
  `$queryRawUnsafe`/`$executeRawUnsafe` не используются
- **Хеши паролей** не попадают ни в один output-DTO или маппер
