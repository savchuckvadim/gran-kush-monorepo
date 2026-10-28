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

| Плоскость                              | Метод                                                                             | Итог                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Аутентификация на каждом маршруте      | инвентаризация 124 живых маршрутов из OpenAPI + гварды в контроллерах             | 1 дыра (TASK-301), 1 мёртвый контроллер (TASK-305)                                        |
| Скоуп портала в репозиториях           | все `*prisma.repository.ts` на упоминание `portalId`                              | 1 дыра (TASK-302)                                                                         |
| IDOR: выборка по id без владельца      | `findUnique({ where: { id } })` по репозиториям                                   | чисто, кроме TASK-302                                                                     |
| Гвард навешен, но не работает          | `@UseGuards(AdminGuard)` без `@Admin()` — грабли TASK-023                         | чисто: гвард fail-closed с TASK-023                                                       |
| Rate limiting                          | поиск throttler/лимитов                                                           | отсутствовал полностью (TASK-304)                                                         |
| Реальный IP за прокси                  | `trust proxy` в приложении vs `X-Forwarded-For` в nginx                           | не настроен (TASK-304)                                                                    |
| Утечка секретов в ответах              | `password`/хеши в DTO и мапперах                                                  | чисто: хеш только во входных DTO                                                          |
| Энтропия токенов                       | генерация токенов верификации, сброса, приглашений, ссылок                        | чисто: `randomBytes(24…32)`, `Math.random` в безопасности нет                             |
| Энумерация пользователей               | ответ `password/reset/request` для существующего и несуществующего email          | чисто: ответ одинаковый                                                                   |
| Инвалидация сессий                     | отзыв refresh при смене пароля                                                    | не было (TASK-303)                                                                        |
| SQL-инъекции                           | все `$queryRaw`/`$executeRaw`                                                     | чисто: только теговые шаблоны, `*Unsafe` не используется                                  |
| Уязвимости зависимостей                | `pnpm audit`                                                                      | 220 advisories (TASK-306)                                                                 |
| Загрузка файлов (2026-09-02)           | три пути загрузки, превью, `S3Service`, потолки тела                              | тип и размер не проверялись, объекты не удалялись (TASK-309)                              |
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
  `HttpException`, а `http-errors` со `statusCode` в объекте. Прежний фильтр отдал бы на них 500. Теперь статус и текст берутся из ошибки.
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

## Аудит 2026-10-12 (TASK-661, HEAD `dd14f41`)

Второй проход после TASK-6xx ([crm-polish](crm-polish.md)): тенант-скоуп, авторизация, публичные
маршруты, auth-флоу, динамические поля, конфиг, зависимости, фронты. TASK-301…306, 308…310 на месте.
Из старого списка открыты: TASK-307 (заголовки), `tls.rejectUnauthorized: false` в SMTP, `axios`.

Что усугубляет всё ниже: `POST /platform/portals/register` создаёт владельца с `isActive: true,
emailConfirmed: false` (`portal-registration.service.ts:83-84`) — без подтверждения почты и
модерации любой становится `portal_owner` одним запросом.

Исполняемая часть аудита — `apps/api/test/security.e2e-spec.ts`: проверки, которые уже держатся,
написаны как обычные тесты, а дыры ниже — как `it.failing` (падают, когда дыра закрыта: тогда
тест переводится в обычный). Сканеры — `.github/workflows/security.yml` (pnpm audit, gitleaks,
Semgrep, Trivy, ZAP по OpenAPI).

### TASK-662: приглашение сотрудника перехватывает чужой аккаунт `[x]` P0 — critical

- `invitations.service.ts:115-158`: `accept()` зовёт `ensureUserWithPassword`; для аккаунта с
  паролем тот возвращает пользователя **без проверки пароля**
  (`account-provisioning.service.ts:75`), после чего выдаются access/refresh этого пользователя.
- Токен приглашения отдаётся создавшему админу в ответах create/list
  (`crm-invitations.controller.ts:28`), письма с приглашением нет (шаблона в `modules/mail` нет,
  CRM копирует ссылку в буфер) — комментарий «владение адресом доказано» неверен.
- JWT глобальные: с `X-Portal-Slug` клуба жертвы `MembershipGuard` даёт роль жертвы там,
  включая владельца.
- [x] Существующий аккаунт доказывает, что он его: `accept` для `passwordHash !== null`
      сверяет `dto.password` с хешем (bcrypt) и без совпадения отвечает 401, токенов не выдаёт
      (`fix/security-662-666`, 2026-10-12); страница принятия в CRM требует пароль аккаунта
- [x] Приглашение уходит письмом (`employee-invitation.template.tsx`, ссылка на `/{lang}/auth/invite/{token}`
      в CRM), токен показывается один раз в ответе на создание и не возвращается в списке; в CRM ссылку
      видно только сразу после создания (`fix/security-662-664`, 2026-10-14)
- [x] `CreateInvitationDto.role` не принимает `portal_owner` (`INVITABLE_ROLES`, 400)
- [x] Приглашение на аккаунт без пароля (`pending_claim`, его завёл другой клуб) не ставит пароль:
      409 и письмо «задайте пароль» (шаблон `account-setup`), после чего приглашение принимается уже
      с паролем
- [x] Новый аккаунт по приглашению создаётся неподтверждённым (ссылку видел и админ): письмо
      подтверждения CRM, в ответе `awaitingEmailConfirmation: true` без токенов, вход — после
      ссылки из письма; страница принятия в CRM показывает «осталось подтвердить почту»
- [x] e2e `invite-accept-existing-account`, `owner role`, `token not in list`, `invite does not claim`,
      `new account from an invitation signs in only after confirming` — обычные тесты в
      `security.e2e-spec.ts`

### TASK-663: клуб присоединяет любой аккаунт по email и читает его документы `[x]` P0 — critical

- `POST /crm/members` без роли; `createFromCrm` → `ensurePendingClaimUser` возвращает любого
  существующего пользователя (`account-provisioning.service.ts:19-23`,
  `members.service.ts:185-203`). Публичная ссылка регистрации делает то же
  (`registration-links.service.ts:237-260`).
- Документы лежат на аккаунте, а не на членстве: `toCrmMemberFullDto` отдаёт все документы
  пользователя с номером (`members.service.ts:112-115,134`), превью стримит сканы и подпись
  (`crm-members.controller.ts:244-279`), `PATCH :id/files` перезаписывает и удаляет старые
  объекты (`members.service.ts:331-354`).
- [x] Существующий аккаунт вступает в клуб только после согласия владельца аккаунта:
      `createFromCrm` для существующего пользователя создаёт членство в статусе «ожидает
      подтверждения» без доступа к данным аккаунта, пользователю уходит письмо/уведомление в
      кабинет; до подтверждения карточка в CRM — только email
- [x] Документы — то, что пользователь показал этому клубу: связь «документ ↔ членство»
      (или флаг `sharedWithPortalIds`), `toCrmMemberFullDto`/превью/`PATCH files` фильтруют по ней
- [ ] Создание участника — роль `manager+` (решение Вадима: пока любой сотрудник, до настоящих прав)
- [x] e2e `crm-create-member-existing-user`, `crm-files-foreign-account` (есть как `it.failing`)

**Сделано 2026-10-12 (ветка `feat/member-consent`)** — ровно по схеме и правилам ниже:
миграция `20261012200000_member_consent_document_shares` (поля `consent_*`, `signature_shared`,
таблица `member_document_shares` + бэкфилл); `MemberDocumentShareRepository` в модуле `account`;
`AccountFilesService.replace*` принимает `share` («всем подтверждённым членствам» — загрузка из ЛК,
`{ memberId }` — загрузка из CRM); `JoinPortalService` при самостоятельном вступлении (ЛК, ссылка,
киоск) показывает клубу всё, при создании из CRM — ничего; `MemberConsentService` +
`GET/POST /public/consent/:token[/confirm|/decline]` (пароль bcrypt, токен 14 дней) и
`POST /crm/members/:id/consent/resend` (`EMAIL_THROTTLE`); письмо `membership-consent`;
`ensureUserWithPassword({ verifyPassword })` — публичная ссылка регистрации с чужим email и
неверным паролем → 401; `GET /lk/portals` не показывает `pending`-членства. CRM: страница
`/[locale]/consent/[token]`, бейдж «ждёт согласия» в списке и карточке, кнопка «отправить письмо
ещё раз», документы скрыты до подтверждения. e2e: три теста в `security.e2e-spec.ts`.
Не вошло: отдельная страница согласия в ЛК (`apps/web`) — на проде кабинет не поднят, ссылка из
письма ведёт в CRM; `pending_claim`-аккаунт без пароля, заведённый другим клубом, по-прежнему
присоединяется сразу. ~~Его документы другому клубу всё равно не видны — share нет~~ — неверно:
самостоятельное вступление делает `shareAllOfUser`, и чужая ссылка регистрации с этим email открывала
клубу документы, загруженные другим клубом. Закрыто в TASK-664 (2026-10-14).

**Решение Вадима (2026-10-12): вариант B — полный consent-флоу со схемой.** Участников по-прежнему
создаёт любой сотрудник (права — отдельной задачей).

Схема:
- `Member.consentStatus` (`confirmed | pending`, по умолчанию `confirmed`), `consentToken`
  (32 байта, `@unique`), `consentRequestedAt`, `consentConfirmedAt`; `Member.signatureShared`.
- `MemberDocumentShare { memberId, userDocumentId }` `@@unique` — «документ показан этому клубу».
- Миграция-бэкфилл: все существующие членства `confirmed`, share на каждую пару (членство,
  документ того же аккаунта), `signatureShared = true`, где подпись есть — клубы, которые сами
  загрузили документы, ничего не теряют.

Правила:
- `createFromCrm` для аккаунта **с паролем** → членство `pending` + токен + письмо «Клуб X добавил
  вас — подтвердите» со ссылкой `${CRM_FRONTEND_URL}/{lang}/consent/{token}` (кабинет на проде не
  деплоится, страница живёт в CRM как `/join`); ответ `awaitingConsent: true`. Новый или
  `pending_claim` аккаунт — как раньше, `confirmed` (это онбординг самим клубом).
- Публичная ссылка регистрации и `/lk/auth/member/register` для существующего аккаунта с паролем
  — только после проверки пароля (bcrypt, как в TASK-662), иначе 401; тогда членство `confirmed`.
- `POST /lk/portals/:slug/join` (действует сам владелец) → `confirmed`.
- Документы: `toCrmMemberFullDto` отдаёт только share этого членства, `hasSignature` =
  `signatureShared`; превью и `getMemberAccountDocument` проверяют share; `PATCH :id/files` при
  `pending` → 403, после подтверждения загруженное клубом автоматически share с этим членством;
  документы, загруженные участником в потоке регистрации с контекстом клуба
  (`/lk/auth/member/files`), — share с этим членством.
- Публичные эндпоинты (`PUBLIC_TOKEN_THROTTLE`): `GET /public/consent/:token` (клуб, email, список
  документов аккаунта — тип и сторона), `POST …/confirm { password, shareDocumentIds, shareSignature }`
  (пароль сверяется, иначе 401; `confirmed` + share), `POST …/decline { password }` (членство
  удаляется). Токен живёт 14 дней; `POST /crm/members/:id/consent/resend` — новое письмо.
- CRM: бейдж «ожидает подтверждения» в списке и карточке, вместо документов — подпись «появятся
  после подтверждения участником», кнопка «отправить письмо ещё раз»; страница
  `/[locale]/consent/[token]` по образцу `/join` (`NON_PORTAL_SEGMENTS` + `consent`).
- e2e: тест 663 переводится из `it.failing`; добавить: confirm с неверным паролем → 401; после
  confirm документы видны только выбранные; `PATCH files` при `pending` → 403; публичная ссылка
  для существующего аккаунта без пароля → 401.

### TASK-664: клейм и вход без подтверждённой почты `[x]` P0 — high

- `POST /lk/auth/member/register` ставит пароль на pending-аккаунт
  (`member-registration.service.ts:49-62`) и сразу выдаёт токены
  (`use-cases/member-registration.service.ts:29-42`); они работают на `@AllowUnconfirmed`
  `POST /lk/auth/member/files` — документы можно подменить до того, как настоящий владелец
  нажмёт ссылку в письме. Ссылки регистрации — так же (`registration-links.service.ts:238`,
  `account-provisioning.service.ts:62-72`).
- Pre-hijack: регистрация портала и принятие приглашения дают держать пароль на чужой email;
  вход участника проверяет только `isActive` (`member-auth.service.ts:29`).
- [x] Клейм pending-аккаунта — только по ссылке из письма: `AccountProvisioningService` без доказанного
      email не ставит пароль (`claimByEmail`); регистрация в кабинете, ссылка регистрации и приглашение
      шлют письмо «задайте пароль» (`EmailVerificationService.sendAccountSetup`, шаблон `account-setup`,
      7 дней, ссылка `/auth/reset-password?token=…&setup=1`; сброс пароля заодно активирует аккаунт).
      То же письмо уходит сразу при создании участника из CRM с новым email — так участник попадает
      в кабинет. Вступление такого аккаунта в клуб — без показа документов
      (`JoinPortalInput.shareDocuments: false`). `POST /lk/auth/member/register` токенов не выдаёт
      (`awaitingEmailConfirmation: true`), документы едут в том же запросе (`files`), и только у нового
      аккаунта; `@AllowUnconfirmed` с `/lk/auth/member/files` снят (`fix/security-662-664`, 2026-10-14)
- [x] Вход в кабинет требует `emailConfirmed`; «не подтверждён» — только после верного пароля (и в CRM).
      Подтверждение почты — только ссылка, пароль остаётся из регистрации (решение Вадима 2026-10-14:
      без повторного ввода). Чужая предрегистрация на этот email не даёт ничего: до подтверждения нет
      ни сессии, ни файлов, а владелец адреса забирает аккаунт через «Забыли пароль» (гасит сессии)
- [x] Регистрация портала — **решение Вадима 2026-10-14: оставить** автологин владельца и баннер
      «подтвердите почту» (TASK-506). Захват ограничен собственным клубом злоумышленника; владелец
      адреса возвращает аккаунт через «Забыли пароль»
- [x] e2e: `link does not claim a passwordless account nor show its documents`,
      `member signs in only after confirming the email` (через ссылку регистрации — `/lk/auth/member/register`
      в jest по-прежнему отвечает 500 из-за dynamic import шаблонов писем); unit — в
      `registration-links.service.spec.ts`
- Осталось: отдельный шаблон письма «задайте пароль» вместо письма сброса для клейма; ссылки из писем
  участнику ведут в кабинет (`MEMBER_FRONTEND_URL`), который на проде не поднят

### TASK-665: перебор email `[x]` P1 — high

- `POST /lk/auth/member/check` (`member-registration.controller.ts:65-73`,
  `user-prisma.repository.ts:46-64`) отдаёт `exists`, `hasPassword`, число членств и работ по
  любому email; троттлинг общий (300/мин), фронты не используют. Это и список аккаунтов для
  TASK-664, и факт членства в каннабис-клубе.
- Такие же утечки: флаги `claimed`/`accountCreated`/`isNewUser` в ответах, 409 на регистрации,
  «Email not confirmed» до проверки пароля (`member-auth.service.ts:29`,
  `employee-auth.service.ts:30`).
- [x] `/lk/auth/member/check` удалён вместе с `checkUserExists` и
      `UserRepository.findMembershipCountsByEmail` (`fix/security-662-666`, 2026-10-12; e2e
      `member-check-removed` — обычный тест)
- [x] «Не подтверждён» и «нет активной работы» — только после верного пароля (вход в CRM и кабинет,
      `fix/security-662-664`, 2026-10-14); ответ регистрации в кабинете без `claimed` и токенов
- [x] Регистрация в кабинете: один ответ `{ email, awaitingEmailConfirmation }` без id для нового и
      занятого адреса, владельцу занятого — письмо «аккаунт уже есть», пароль хешируется в обеих ветках
      (TASK-739, 2026-10-17; e2e `sign-in-abuse`). Вход отвечает за одно время на любой адрес.
      Осознанно оставлены: 409 регистрации клуба (B2B-форма, владелец входит сразу) и проверка пароля
      существующего аккаунта при вступлении по ссылке (это и есть способ вступить своим аккаунтом;
      ссылка клуба и общий лимит)

### TASK-666: тенант-скоуп и валидация — средние `[x]` P1

- [x] **M1** `order-stages.service.ts`: `stage.update({ where: { id } })` без проверки категории
      позволял править стадию чужого клуба — теперь `updateMany({ id, stageCategoryId })`, при
      count = 0 — 404 и откат транзакции (`fix/security-662-666`, 2026-10-12; e2e
      `foreign-stage-id` — обычный тест)
- [x] **M2** перевыпуск QR не гасил старый код — закрыто в TASK-701: подпись кода считается от
      `issuedAt`, перевыпуск меняет его, и прежний код отвечает `revoked` (e2e TASK-701 в
      `security.e2e-spec.ts`)
- [x] **M3** динамические поля: `document`/`signature` принимали любой объект, `text` — без лимита
      длины, `url` — без проверки схемы, select/relation без опций — любую строку, поля сотрудника
      минуют валидатор (в т. ч. публичное принятие приглашения), массив в `isMultiple` — строка на
      элемент без лимита. Теперь правила — одна функция `coerceDynamicFieldValue` с потолками
      `DYNAMIC_FIELD_LIMITS` (string ≤ 2 000, text ≤ 10 000, ≤ 50 значений, `url` только http(s),
      объект только `{ fromAccount }`); правило поля потолок только ужесточает. Профиль сотрудника
      (создание, правка, приглашение) идёт через `validatePartialUpdate`, `FieldValuesService`
      режет лишние элементы последним рубежом (`fix/security-666-r1-r2`, 2026-10-21; unit
      `coerce-dynamic-field-value.spec.ts`, e2e `dynamic-field-limits`)
- [x] **M4** `GET /public/portals/:slug` отдавал карточку любого клуба — теперь 404, пока клуб не
      опубликован на карте (`isListedOnMap`), как и в `/public/portals/map` (e2e
      `dynamic-field-limits`). `/crm/portals/resolve` нужен SSR CRM для любого клуба и остаётся:
      отдаёт только id, название и статус, лимит `PUBLIC_TOKEN_THROTTLE` — принято
- [x] **M9** `GET /cabinet/members/me` отдавал полную CRM-карточку с заметками сотрудников и всеми
      полями анкеты. Теперь `CabinetMemberProfileDto`: поля переносятся поимённо
      (`cabinet-member-profile.mapper.ts`), заметок и `fields` нет (`fix/cabinet-data-leaks`,
      2026-10-17; e2e в `security.e2e-spec.ts`)
- [x] `qr-code-prisma.repository.ts` и `presence-session-prisma.repository.ts`: поиск записи
      участника без обязательного `portalId` (R3 в [refactor-plan](refactor-plan.md)). Теперь
      `portalId` обязателен в `findByMemberId`/`create` QR и в `findById`/`findActiveByMemberId`/
      `createEntry` присутствия; кабинет передаёт портал участника (`fix/cabinet-data-leaks`, 2026-10-17).
      Без портала остался только общий счётчик присутствующих для крона
- [x] Отмена заказа проверяла статус неатомарно — закрыто переходом на стадии: `applyStage`
      делает compare-and-set по текущей стадии, склад возвращается в той же транзакции,
      проигравший параллельный запрос получает 409 (`order-stages.service.ts`)

### TASK-667: лимиты, заголовки, прокси `[~]` P1 (поглощает TASK-307)

- [x] Лимит входа по адресу в Redis (`PasswordSignInService`): 10 неудач за 15 минут закрывают вход
      паролем по адресу при любом IP — CRM, кабинет и админка платформы (TASK-739, 2026-10-17;
      e2e `sign-in-abuse`). Лимит по IP (`AUTH_THROTTLE`) остаётся
- [~] Dokploy: `TRUST_PROXY_HOPS` по умолчанию 2 в compose всех инсталляций (Cloudflare + Traefik).
      Открыто (Вадим, в панели): Cloudflare в режиме Full (не strict), allowlist IP Cloudflare нет —
      если сервер достижим напрямую, `X-Forwarded-For` подделывается
- [x] Заголовки (`fix/security-667-669`, 2026-10-28). CRM и кабинет: HSTS, nosniff, Referrer-Policy,
      CSP `frame-ancestors 'self'; base-uri 'self'; object-src 'none'` (админка — `frame-ancestors 'none'`);
      `script-src` не задан — нужны nonce для Next и скриптов входа Google/Telegram. Сайт и itfirma —
      HSTS, nosniff, `frame-ancestors 'self'` (раньше). API — `helmet` (HSTS, nosniff,
      `X-Frame-Options`, COOP, без `X-Powered-By`; CSP выключен — JSON, Swagger и просмотр PDF;
      CORP `same-site` — файлы API встраивают поддомены того же домена)

### TASK-668: сессионные токены `[x]` P1

- [x] Refresh хранится как SHA-256 (`refresh-token.repository.ts`, `audit/auth-flow`, 2026-10-14):
      дамп таблицы не даёт готовых сессий; e2e `refresh tokens are stored hashed`
- [x] Одноразовые токены писем — подтверждение почты, сброс пароля и account-setup, согласие на
      членство, приглашение сотрудника — тоже хранятся как SHA-256 (`common/crypto/secret-token.ts`):
      в письмо или ответ уходит сам токен, в БД — хеш, поиск по хешу. Миграция
      `20261017150000_hash_secret_tokens` хеширует уже выданные, старые ссылки работают
      (`fix/cabinet-data-leaks`, 2026-10-17). В e2e токен берётся из письма (`test/support/mail-tokens.ts`)
- [x] Веб-refresh (`/crm/auth/refresh`, `/lk/auth/refresh`) больше не дублирует токены в JSON —
      только HttpOnly-куки (`WebRefreshResponseDto`); мобильные `/mobile/` оставлены с JSON
- [x] Повтор refresh детектируется: сессии `auth_sessions`, ротация compare-and-set, прежний токен в
      окне 30 с — гонка вкладок (`refresh_superseded`), позже — отзыв сессии `reuse_detected`
      (TASK-733, 2026-10-17; e2e `auth-sessions`)
- [x] Куки токенов — host-only на хосте API, refresh только на `/{aud}/auth`; фронтам — подсказка
      `*_session=1` на общем домене (TASK-734, 2026-10-17)

### TASK-669: рантайм, зависимости, CI `[~]` P1

- [x] 2026-10-23 (`fix/next-rce-16-4`): Security на main упал на трёх critical из свежих advisory — две RCE без
      авторизации в Next `>=16.0.0 <=16.4.0` (Image Optimization с SVG; `use cache` с typed arrays) и обход
      `SAFE_FOR_TEMPLATES` в DOMPurify 3.4.8 (сайт через Payload/monaco). Next 16.3.8 → 16.4.2 в crm, admin, site
      (16.4.3 вышла в тот же день — не брали), override `dompurify@3 >=3.4.17`. `pnpm audit --prod`: 0 critical
- [x] Образы переведены на `node:22-slim` (`chore/next-16-3-8`, 2026-10-12): Node 20 — EOL, и
      Next 16.3.8 зовёт `util.markAsUncloneable`, которого в Node 20 нет (образ `site` не
      собирался). Проверено локальной docker-сборкой `site` и `api`
- [x] Контейнер API работал от root, образ — 4,1 ГБ (runner копировал весь `/app` с `node_modules`
      монорепы; инцидент 12.10.2026: диск 100 %, все Postgres в Restarting). С `fix/security-667-669`
      (2026-10-28): runner — `pnpm deploy --prod` только API, `USER node`; `prisma` и `dotenv` —
      рантайм-зависимости (миграции на старте), сид админа собирается с API (`dist/seed-admin.main`),
      entrypoint без pnpm. Janitor по-прежнему root через `user` в compose. Уборка диска — TASK-674
- [x] `apps/site` и `apps/itfirma`: `next-intl` ^4.14 как в CRM (было 4.8.3), `next` 16.4.2 везде
- [x] `next` 16.3.8 во всех приложениях (SSRF в `next/image`), `sharp` 0.35.5, `source-map-js`,
      и pnpm overrides по пропатченным версиям внутри мажоров: `proxy-addr` >= 2.0.8 (critical —
      подмена IP через IPv4-mapped адреса, ломала лимиты по IP), `path-to-regexp` 8.x,
      `picomatch`, `fast-uri`, `js-yaml`, `undici`, `ws`, `lodash`, `browserslist`
      (`chore/next-16-3-8`, 2026-10-12). Внутренности Prisma CLI (`effect`, `hono`, `defu`,
      `mysql2`, `deepmerge-ts`) не переопределяем: override `effect` ломает загрузку
      `prisma.config.ts`, в рантайме образа их нет
- [ ] Workflow `Security`: `pnpm audit` и Trivy падают только на critical; оставшиеся high —
      CLI-цепочки Prisma/Payload/drizzle и `braces` под sass (без фикса) — закрывать при
      обновлении Prisma и Payload; Trivy misconfig по Dockerfile (root, Node 20) — пункт выше
- [~] `ci.yml` — `permissions: contents: read` (2026-10-28); SSH из CI ушёл вместе с деплоем через
      Dokploy. Открыто: actions не прибиты к SHA (решить вместе с Dependabot)
- [x] Слабые дефолты: без `JWT_SECRET` (2026-10-14) и без `ENCRYPTION_MASTER_KEY` (2026-10-28, раньше —
      случайный ключ на запуск) API не стартует. Платформенный JWT ушёл с переездом админки на сессии
      (TASK-666). `PAYLOAD_SECRET || ""` — не дефолт: Payload сам не стартует без секрета
- [~] dev-compose публикует Postgres и Redis только на 127.0.0.1, пакет `add` удалён (2026-10-28).
      Открыто: Redis без пароля — в проде он только во внутренней сети проекта; пароль — с новым
      секретом `REDIS_PASSWORD` в трёх инсталляциях

### TASK-670: мелочи `[ ]` P2

- [ ] Токены в путях (`/public/invitations/<t>`) попадают в лог (`/auth/verify/<t>` удалён 2026-10-17)
      (`global-exception.filter.ts:114`); email в логах уровня info (`mail.service.ts`)
- [ ] Упавшие mail-джобы хранят ссылки сброса 7 дней (`job-options.ts:35`); base64 сканов в
      Redis до суток
- [ ] Payload `/admin` публичный без 2FA; media принимает SVG (`collections.ts:28`);
      `resolveHref` пропускает `javascript:` (`routes.ts:38`)
- [ ] Лимиты длины: `publicDescription`, `coverImageUrl` (не проверяется как URL),
      `membershipNumber`; `items` заказа без максимума
- [ ] Любой сотрудник создаёт участников и выпускает/отзывает QR — решить с Вадимом
- [~] CRM: слаг в URL без кодирования (`[portal]/layout.tsx:20`) — открыто; `/crm/portals/resolve`
      без слага — теперь 400, неизвестный слаг — 404, добавлены `@Public` и троттл
      (`audit/auth-flow`, 2026-10-14; e2e `resolve endpoint answers 400/404`)

### Проверено 2026-10-12 и в порядке

Все raw SQL параметризованы (включая новые поиск и cron); подпись вебхука Stripe fail-closed;
Swagger выключен в проде; `.env` нет ни в истории git, ни в образах; письма экранированы
(React Email); `dangerouslySetInnerHTML` — только статические скрипты и экранированный JSON-LD;
редирект `from` в CRM безопасен (`club-target.ts:6-9`); токены нигде не в localStorage;
платформенный admin-токен в HttpOnly cookie; деактивированные сотрудники и участники отрезаются
следующим запросом; токены сброса одноразовые, живут час; токены — 24–32 случайных байта.

---

## Аудит auth-флоу 2026-10-14 (TASK-678, ветка `audit/auth-flow`)

Третий проход: только аутентификация, от контроллеров и гвардов до фронтов и api-client.
Матрица всех 47 контроллеров против гвардов — чисто, кроме пунктов ниже. Исправлено сразу
(unit 292, e2e 241 зелёные, новые тесты в `security.e2e-spec.ts` → `auth audit 2026-10-14`):

- **Refresh-токены** — SHA-256 в БД, веб-refresh без токенов в JSON (см. TASK-668 `[~]`);
  `X-Device-Id` теперь шлёт api-client (uuid в localStorage) — одна строка на устройство
  вместо строки на каждый вход; добавлен `AuthCronService`: ежедневная уборка протухших
  и давно отозванных строк (раньше таблица росла бесконечно)
- **Принятие приглашения существующим аккаунтом** выдавало access/refresh в JSON-теле
  публичного ответа — теперь HttpOnly-куки CRM, в теле только `awaitingEmailConfirmation`
- **`status = blocked` нигде не проверялся**: login, validate JWT, rotate, verifyEmail,
  resetPassword и письма молча оживляли бы заблокированный аккаунт. Теперь блокировка
  держится по всем путям (unit `email-verification.service.spec.ts`, e2e `a blocked account`)
- **TTL refresh в БД** парсился только в днях: `JWT_REFRESH_TOKEN_EXPIRES_IN=24h` жил бы в БД
  24 дня (подпись при ротации не перепроверяется — срок БД и был настоящим). Общий
  `parseDurationToMs` для кук и токенов
- **`JWT_DEFAULTS.SECRET`** удалён (см. TASK-669)
- **Гонка регистрации** (двойной сабмит одного email/слага) давала 500 — теперь 409
  (`member-registration.service.ts`, `portal-registration.service.ts`)
- **Повторная отправка подтверждения**: участнику и приглашённому сотруднику некуда было
  нажать «вышлите ещё раз» — вход уже запрещён, а resend требовал сессию. Добавлены публичные
  `POST /lk/auth/member/confirm-email/resend` и `POST /crm/auth/confirm-email/resend-public`
  (ответ не раскрывает существование адреса; e2e `the public resend endpoint`), страница
  в кабинете подключена (была заглушка с TODO)
- **api-client**: ретрай после 401 пересобирал Request из body-стрима без `duplex` —
  TypeError, и POST после успешного refresh возвращал исходный 401. Теперь ретраится
  сохранённый клон; не-401 ошибки ретрая идут как `ApiClientError`; на `/auth/login|refresh`
  и `/public/*` refresh не дёргается; `console.log` убран
- **Кабинет**: `/lk/auth/me` читал тело ответа дважды → ошибка без `status`, редирект на
  логин по 401 не срабатывал; logout чистил кэш только при успехе и дёргал два redirect;
  `?from=` на логине игнорировался (теперь только внутренние пути); язык письма сброса
  не передавался
- **CRM**: переключение клуба не чистило TanStack-кэш — ключи без слага секунду показывали
  данные прошлого клуба; `/crm/portals/resolve` — 400/404 вместо 500 (TASK-670)
- **Троттлинг**: все четыре `POST .../logout` были только под общим лимитом — добавлен AUTH
- **Referrer-Policy** на всех трёх фронтах (TASK-667 `[~]`)

Открыто (решить с Вадимом, без кода):

- [x] **Регистрация с чужим pending_claim email + контекст клуба** — решено 2026-10-14
      (Вадим: «нужно подтверждение email»). Оба пути (`register`, `registerViaLink`, включая
      киоск) создают членство consent=pending; клейм доказывается в `resetPassword`
      (ссылка из account-setup/reset-письма), после чего `ClaimedMembershipRepository.
      confirmPendingSelfJoins` подтверждает такие членства (joinSource != crm). Документы
      при этом НЕ расшариваются — клуб видит только анкету из формы. В CRM до клейма —
      бейдж «ждёт согласия». E2e: security.e2e-spec «TASK-678: членство из клейм-регистрации»
- [ ] **Существующий аккаунт не может зарегистрировать клуб**: `POST /platform/portals/register`
      отвечает 409 на любой занятый email (плюс перебор email — часть TASK-665)
- [ ] **Плоский employee** читает финансы (`/crm/finance/*`), превью документов и подписи
      участников, список сотрудников; создаёт участников, QR, check-in — решение 2026-10-14:
      система прав со скоупами, кастомными ролями и виджетом в настройках → **TASK-679**
      (`crm-polish.md`)
- [ ] **Админка**: refresh в api-client для admin бьёт в несуществующий `/api/crm/auth/refresh`;
      мёртвые `AuthProvider`/`CrmLogout`/register-редирект в никуда — вычистить при рефакторинге
- [ ] `@AllowUnconfirmed()` больше нигде не используется — убрать декоратор и ветку в гвардах
      при рефакторинге auth
- [ ] `TRUST_PROXY_HOPS=2` на проде за Cloudflare (повтор из TASK-667): иначе лимиты считают
      всех клиентов одним IP Cloudflare

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

---

## Аудит auth 2026-10-17 (TASK-742, ветка `audit/auth-2026-10`)

Четвёртый проход — после перестройки auth (TASK-730…741): сессии, одноразовые ссылки, реестр
провайдеров, права. Инвентаризация теперь автоматическая: `test/route-auth.e2e-spec.ts` поднимает
приложение, обходит 242 маршрута и падает, если маршрут не `@Public()` и не под гвардом сессии или
`@RequirePermission` стоит без `PermissionGuard`. Матрица — [AUTH_ROUTES.md](../backend/AUTH_ROUTES.md).

Найдено и исправлено:

- **A1 (high) CSRF с соседнего поддомена.** `SameSite=Lax` не различает `paf-paf.app` и
  `api.paf-paf.app` — это один «сайт», а API разбирал `x-www-form-urlencoded` на всех маршрутах. Форма
  на любом поддомене (сайт Payload, будущий поддомен с чужим контентом) отправила бы изменяющий запрос
  с куками сессии без CORS-проверки. Теперь `SessionOriginMiddleware`: изменяющий запрос с кукой
  сессии — только с `CORS_ORIGIN` или самого API (`Origin`, без него — `Referer`), иначе 403
  `origin_not_allowed`; тело — только JSON. e2e `route-auth` → «forged requests».
- **A2 (medium) лишний публичный контроллер `/auth/*`.** Дубль маршрутов CRM и кабинета, в том числе
  `GET /auth/verify/:token`: подтверждение по GET гасит одноразовую ссылку, когда почтовый сканер
  открывает её для предпросмотра. Фронты им не пользовались — удалён.
- **A3 (medium) токены в localStorage по умолчанию.** У `configureApiClient` стратегия по умолчанию
  была `token` — клиент без опции хранил бы access и refresh в localStorage. Стратегия удалена,
  клиент только на куках.
- **A4 (low) маршруты без явного доступа.** `/`, `/health`, `/ready`, `POST /platform/auth/login`
  работали только потому, что глобального гварда нет. Размечены `@Public()`; новый такой маршрут
  уронит тест.
- **A5 (low) вход админки платформы** без лимита по адресу и с разным временем ответа — теперь общий
  `PasswordSignInService`.

Закрыто перестройкой (подробности — в задачах выше и в AUTH_ARCHITECTURE): мгновенный отзыв сессий и
повтор refresh (TASK-733), куки по хосту и аудитории (TASK-734), одноразовые ссылки с гашением прежних
(TASK-736), привязка провайдера к одному аккаунту и `@@unique([userId, provider])` (TASK-737),
одинаковые ответы и лимит по адресу (TASK-739), права вместо ролей в коде (TASK-730…732).

Проверено и в порядке: подпись и срок JWT с `aud` и `typ`, разные секреты access и refresh; сессия
на каждый запрос и блокировка аккаунта; OAuth — state с nonce в HttpOnly-куке, PKCE, проверка nonce в
id_token, фильтр `returnTo`; Telegram — HMAC ключом бота аудитории и свежесть ответа; ссылки писем —
SHA-256, одноразовые, атомарное гашение; роль не шире своих прав; межклубный доступ (`tenant-isolation`);
`from` после входа — только пути нашего приложения.

Принятые риски и открытое:

- [x] **R1** Админка платформы — JWT без серверной сессии: отзыв только деактивацией админа. Теперь вход —
      строка `auth_sessions` с аудиторией `platform`: access 15 мин и refresh с ротацией, как у CRM;
      выход, смена и сброс пароля гасят её сразу. `PLATFORM_JWT_SECRET` больше не нужен (подпись —
      `JWT_SECRET`/`JWT_REFRESH_SECRET`, claim `aud` не пускает токен в чужую аудиторию). Сервер админки
      держит обе куки и обновляет пару при 401; параллельные запросы делят один refresh. Событий
      `session.revoked` и строк в списке устройств у этих сессий нет (`fix/security-666-r1-r2`,
      2026-10-21; e2e `platform-sessions`)
- [x] **R2** Запрос сброса пароля: для существующего адреса выписывается ссылка и ставится письмо —
      ответ был на долю миллисекунд дольше. Теперь сброс и повтор письма подтверждения отвечают не
      раньше `EMAIL_LOOKUP_MIN_RESPONSE_MS` (400 мс, `withMinDuration`), сбой почты ответ не меняет
      (`fix/security-666-r1-r2`, 2026-10-21; unit `min-duration.util.spec.ts`)
- **R3** Лимит по адресу позволяет запереть вход паролем чужого адреса на 15 минут; Google, Telegram и
  сброс пароля при этом работают — принято
- **R4** Перехваченный ответ виджета Telegram годен час (так устроен Telegram Login, ответ идёт по HTTPS) —
  принято
- Заголовки безопасности (CSP, HSTS, `frame-ancestors`) — по-прежнему TASK-667
