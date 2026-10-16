# Перевод данных (content i18n)

Интерфейс CRM и кабинета переведён через next-intl, а подписи **данных** (поля, статусы) приходят с API.
Этот документ — о вторых: как системные поля и статусы показываются на языке интерфейса.

## Что где переводится

| Что                      | Где живёт перевод                                                                                                                                                                 | Пример                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Строки интерфейса        | JSON next-intl: `apps/{crm,web}/modules/shared/config/i18n/messages/{ru,en,es}`                                                                                                   | «Сохранить», заголовки, плитки                             |
| Системные подписи данных | `labelI18n` (`{ es, ru, en }`) в шаблонах `apps/api/src/common/reference-data/global-templates.seed.ts` → копируется в `FieldDefinition.labelI18n` / `StatusItem.labelI18n` клуба | `first_name`: Nombre / Имя / First name; статусы участника |
| Своё содержимое клуба    | Один язык — тот, на котором клуб написал                                                                                                                                          | свои поля, опции списков, свои статусы, `labelOverride`    |

Базовая подпись в БД (`label`) — английская (`labelI18n.en`), она же запасная.

## Порядок выбора подписи

`resolveLabel({ label, labelI18n, labelOverride }, locale)` в `apps/api/src/common/i18n/`:

1. `labelOverride` клуба (непустой) — всегда главнее;
2. `labelI18n[locale]`;
3. `label`.

Кривой `labelI18n` (не объект, нет языка, не строка) не роняет запрос — берётся `label`.

Если клуб переименовывает поле или статус через настройки (меняет `label`), `labelI18n` очищается:
его слово показывается на всех языках, а синк переводов (ниже) такую строку не трогает.

## Как язык доходит до API

- Клиенты шлют `Accept-Language: <язык из URL>`: `configureApiClient(..., { getLocale })` в `@workspace/api-client`
  (middleware `getLocaleMiddleware`). В CRM и кабинете `getLocale` — первый сегмент пути `/{locale}/...`; на сервере
  заголовок не ставится. Заголовок разрешён в CORS (`allowedHeaders`).
- API: `@RequestLocale()` (параметр контроллера) → `parseRequestLocale(header)`: первичный подтег первого языка,
  только `es | ru | en`, иначе **`es`** (основной рынок — Испания). Контроллер передаёт язык в сервис явно, глобалей нет.
- CRM после смены языка перезапрашивает кэш TanStack Query (`ApiLocaleSync` в `app/[locale]/layout.tsx`); в кабинете
  язык входит в ключ запросов схем форм.

Переводятся ответы для показа: схемы форм всех назначений (`/crm/members/form-schema`,
`/cabinet/auth/member/registration-schema`, `/public/reg-links/{token}`, `/crm/employees/form-schema`,
`/crm/settings/entities/{code}/form-schema/{purpose}`), `filter-fields`, `member/status-items`, поля и статус
в карточке/списке участника (`/crm/members`, `/cabinet/members/me`), поля сотрудника (`/crm/employees`), записи
смарт-процессов (`/crm/entities/{code}/records`).

Эндпоинты редактора настроек (`/crm/settings/entities/{code}/fields`, `status-sets`) отдают **сырые** `label`,
`labelI18n`, `labelOverride` — иначе сохранение записало бы перевод в базовую подпись. Для показа на клиенте —
`getFieldDisplayLabel(field, locale)` в `apps/crm/modules/entities/entity-settings` (тот же порядок).

## Существующие клубы

Порталы, созданные до переводов, имеют `label_i18n = NULL`. `syncSystemLabelTranslations()`
(`common/reference-data/system-label-translations.sync.ts`) дописывает переводы из шаблонов в глобальные шаблоны,
системные поля (`entity code + fieldKey`) и статусы (`status set code + key`), только где `label_i18n IS NULL`
и `label` равен английской подписи шаблона. Запускается:

- на каждом старте API (`SystemLabelTranslationsBootstrap`, `OnApplicationBootstrap`) — прод чинится деплоем,
  ~40 коротких `UPDATE`, в лог пишет, сколько строк заполнено; ошибка не роняет старт;
- в `prisma:seed:admin` и `POST /platform/system/reference-data`.

## Как добавить…

**Системное поле или статус в шаблон.** Добавить в `global-templates.seed.ts` с `labelI18n: { es, ru, en }` —
тип не даст забыть язык. Новые клубы получат перевод при провижининге, а синк — заполнит его у существующих
клубов, если такое поле у них уже есть. Создание самого поля у существующих клубов — отдельная задача (миграция данных).

**Язык.** Добавить код в `CONTENT_LOCALES` (`common/i18n/content-locale.ts`) — TypeScript потребует перевод во всех
шаблонах; добавить язык в next-intl клиентов. Для уже заполненных строк синк не перезаписывает `labelI18n` —
дописать новый язык придётся миграцией данных (`jsonb_set` по `entity code + fieldKey`).

## Фаза 2 (не сделано)

- Редактирование переводов по языкам в настройках CRM (`labelI18n` своих полей и статусов клуба вместо одного `label`).
- Подсказки (`helpText`) и опции списков: у шаблонов сейчас нет ни подсказок, ни опций, поэтому `labelI18n` у
  `FieldOption` пока не заводили.
- Названия стадий воронок (`Stage.name`: Pending / Confirmed…), названия сущностей (`EntityDefinition.name`),
  дефолтные стадии смарт-процессов.
- Письма и уведомления на языке получателя.
