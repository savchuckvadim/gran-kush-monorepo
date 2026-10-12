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

### TASK-662: приглашение сотрудника перехватывает чужой аккаунт `[~]` P0 — critical

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
- [ ] Приглашение уходит письмом (шаблон в `modules/mail`), токен показывается один раз при
      создании и не возвращается в списке
- [ ] `CreateInvitationDto.role` не принимает `portal_owner`
- [x] e2e `invite-accept-existing-account` — обычный тест в `security.e2e-spec.ts`

### TASK-663: клуб присоединяет любой аккаунт по email и читает его документы `[ ]` P0 — critical

- `POST /crm/members` без роли; `createFromCrm` → `ensurePendingClaimUser` возвращает любого
  существующего пользователя (`account-provisioning.service.ts:19-23`,
  `members.service.ts:185-203`). Публичная ссылка регистрации делает то же
  (`registration-links.service.ts:237-260`).
- Документы лежат на аккаунте, а не на членстве: `toCrmMemberFullDto` отдаёт все документы
  пользователя с номером (`members.service.ts:112-115,134`), превью стримит сканы и подпись
  (`crm-members.controller.ts:244-279`), `PATCH :id/files` перезаписывает и удаляет старые
  объекты (`members.service.ts:331-354`).
- [ ] Существующий аккаунт вступает в клуб только после согласия владельца аккаунта:
      `createFromCrm` для существующего пользователя создаёт членство в статусе «ожидает
      подтверждения» без доступа к данным аккаунта, пользователю уходит письмо/уведомление в
      кабинет; до подтверждения карточка в CRM — только email
- [ ] Документы — то, что пользователь показал этому клубу: связь «документ ↔ членство»
      (или флаг `sharedWithPortalIds`), `toCrmMemberFullDto`/превью/`PATCH files` фильтруют по ней
- [ ] Создание участника — роль `manager+` (решить с Вадимом: сейчас может любой сотрудник)
- [ ] e2e `crm-create-member-existing-user`, `crm-files-foreign-account` (есть как `it.failing`)

### TASK-664: клейм и вход без подтверждённой почты `[ ]` P0 — high

- `POST /lk/auth/member/register` ставит пароль на pending-аккаунт
  (`member-registration.service.ts:49-62`) и сразу выдаёт токены
  (`use-cases/member-registration.service.ts:29-42`); они работают на `@AllowUnconfirmed`
  `POST /lk/auth/member/files` — документы можно подменить до того, как настоящий владелец
  нажмёт ссылку в письме. Ссылки регистрации — так же (`registration-links.service.ts:238`,
  `account-provisioning.service.ts:62-72`).
- Pre-hijack: регистрация портала и принятие приглашения дают держать пароль на чужой email;
  вход участника проверяет только `isActive` (`member-auth.service.ts:29`).
- [ ] Клейм pending-аккаунта — только по токену из письма; до подтверждения почты токены не
      выдаются (ни при регистрации, ни по ссылке, ни при принятии приглашения)
- [ ] Вход (CRM и кабинет) требует `emailConfirmed`; при первом подтверждении — сброс пароля,
      заданного до подтверждения, и всех сессий
- [ ] Регистрация портала: владелец неактивен до подтверждения почты (или модерация)
- [ ] e2e `pending-claim-register`, `pre-hijack` — после фикса dynamic import в тестах
      (сейчас `/lk/auth/member/register` в jest отвечает 500, см. память `gran-kush-dev-infra`)

### TASK-665: перебор email `[~]` P1 — high

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
- [ ] Один ответ на все случаи регистрации и входа; «не подтверждён» — только после верного пароля

### TASK-666: тенант-скоуп и валидация — средние `[~]` P1

- [x] **M1** `order-stages.service.ts`: `stage.update({ where: { id } })` без проверки категории
      позволял править стадию чужого клуба — теперь `updateMany({ id, stageCategoryId })`, при
      count = 0 — 404 и откат транзакции (`fix/security-662-666`, 2026-10-12; e2e
      `foreign-stage-id` — обычный тест)
- [ ] **M2** перевыпуск QR не гасит старый: проверка не сравнивает `encryptedCode`
      (`qr-codes.service.ts:185-217`), id тот же — старый код живёт 90 дней вопреки описанию
      `lk-qr-codes.controller.ts:51`. Сравнивать код или версию
- [ ] **M3** динамические поля: `document`/`signature` принимают любой объект
      (`dynamic-payload-validator.service.ts:137-153`), `text` без лимита длины (`:161`), `url`
      без проверки схемы (`:245`), select/relation без опций принимают любую строку (`:220`),
      поля сотрудника минуют валидатор (`employees.service.ts:80,123` — в т. ч. публичное принятие
      приглашения), массив в `isMultiple` — строка на элемент без лимита
      (`field-values.service.ts:91`). Один валидатор с дефолтами (string ≤ 2k, text ≤ 10k,
      массивы ≤ 50, объекты только `{ fromAccount }`), через него все писатели. e2e
      `dynamic-field-limits`
- [ ] **M4** `GET /public/portals/:slug` игнорирует `isListedOnMap`
      (`public-portals.controller.ts:50`), слаги перебираются через `/crm/portals/resolve`
- [ ] **M9** `/lk/members/me` отдаёт полную CRM-карточку, включая заметки сотрудников и все поля
      (`lk-members.controller.ts:28`, `members.service.ts:102,139`) — отдельный DTO кабинета
- [ ] `qr-code-prisma.repository.ts:24` и `presence-session-prisma.repository.ts:24-41`:
      поиск записи участника без обязательного `portalId` (см. R3 в
      [refactor-plan](refactor-plan.md))
- [ ] Отмена заказа проверяет статус неатомарно — два параллельных cancel вернут остаток дважды
      (`orders.service.ts:304-327`)

### TASK-667: лимиты, заголовки, прокси `[ ]` P1 (поглощает TASK-307)

- [ ] Лимиты входа — по аккаунту + IP, хранилище в Redis (сейчас in-memory, per IP + route;
      четыре login-маршрута делят один глобальный пароль)
- [ ] Dokploy: `TRUST_PROXY_HOPS=2`, Cloudflare в режиме Full (не strict), allowlist IP Cloudflare
      нет — если сервер достижим напрямую, `X-Forwarded-For` подделывается (не подтверждено,
      проверить с Вадимом в панели)
- [ ] CRM, кабинет и админка не ставят `frame-ancestors`/`X-Frame-Options`, CSP, HSTS, nosniff
      (`next.config.mjs` всех трёх) — заголовки в `next.config` + `helmet` в API

### TASK-668: сессионные токены `[ ]` P1

- [ ] Refresh, reset и verification хранятся открытым текстом (`refresh-token.repository.ts:24`,
      `email-verification.service.ts:59,139`) — хранить хеш
- [ ] Повторное использование refresh не детектируется (`token-issuer.service.ts:69-106`) —
      при реплее гасить семейство/устройство. e2e `refresh-reuse`
- [ ] Refresh-cookie `Path=/`, `Domain=.paf-paf.app` — уходит на все поддомены, включая сайт
      Payload (`config-cookie.service.ts:70-74`): `Path` на маршрут refresh, домен точечно
- [ ] Refresh-эндпоинты дублируют токены в JSON (`employee-auth.controller.ts:104`,
      `member-auth.controller.ts:101`) — только cookie для web

### TASK-669: рантайм, зависимости, CI `[ ]` P1

- [ ] Образы на Node 20 (`api.Dockerfile:9`, `next.Dockerfile:12`) — EOL с апреля 2026, CI на 22;
      контейнер API работает от root
- [ ] `apps/site`: `next-intl@4.8.3` (помечен в TASK-306), `next@16.3.3`
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
- [ ] `ci.yml` без `permissions:`, actions не прибиты к SHA, SSH `StrictHostKeyChecking=accept-new`
- [ ] Слабые дефолты вместо падения на старте: `ENCRYPTION_MASTER_KEY` → случайный ключ
      (`encryption.service.ts:33`), `JWT_DEFAULTS.SECRET = "default-secret"`
      (`jwt.constants.ts:17`), `PAYLOAD_SECRET || ""`, секрет платформенного JWT из `JWT_SECRET`
- [ ] Redis без пароля; dev-compose публикует Postgres и Redis на 0.0.0.0; лишний пакет `add` в
      зависимостях API

### TASK-670: мелочи `[ ]` P2

- [ ] Токены в путях (`/public/invitations/<t>`, `/auth/verify/<t>`) попадают в лог
      (`global-exception.filter.ts:114`); email в логах уровня info (`mail.service.ts`)
- [ ] Упавшие mail-джобы хранят ссылки сброса 7 дней (`job-options.ts:35`); base64 сканов в
      Redis до суток
- [ ] Payload `/admin` публичный без 2FA; media принимает SVG (`collections.ts:28`);
      `resolveHref` пропускает `javascript:` (`routes.ts:38`)
- [ ] Лимиты длины: `publicDescription`, `coverImageUrl` (не проверяется как URL),
      `membershipNumber`; `items` заказа без максимума
- [ ] Любой сотрудник создаёт участников и выпускает/отзывает QR — решить с Вадимом
- [ ] CRM: слаг в URL без кодирования (`[portal]/layout.tsx:20`); `/crm/portals/resolve` без
      слага — 500

### Проверено 2026-10-12 и в порядке

Все raw SQL параметризованы (включая новые поиск и cron); подпись вебхука Stripe fail-closed;
Swagger выключен в проде; `.env` нет ни в истории git, ни в образах; письма экранированы
(React Email); `dangerouslySetInnerHTML` — только статические скрипты и экранированный JSON-LD;
редирект `from` в CRM безопасен (`club-target.ts:6-9`); токены нигде не в localStorage;
платформенный admin-токен в HttpOnly cookie; деактивированные сотрудники и участники отрезаются
следующим запросом; токены сброса одноразовые, живут час; токены — 24–32 случайных байта.

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
