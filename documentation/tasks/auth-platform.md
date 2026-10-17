# Auth и права: перестройка (TASK-730…)

Дата: 2026-10-17. Целевая схема — [AUTH_ARCHITECTURE](../backend/AUTH_ARCHITECTURE.md). Легенда как в
[pafpaf-launch](pafpaf-launch.md): `[ ]` / `[~]` / `[x]`, P0 / P1 / P2. Поглощает TASK-679 (права),
остатки TASK-665, 667, 668 ([security-audit](security-audit.md)) и открытые пункты аудита auth-флоу
2026-10-14.

Порядок: каждая фаза — своя ветка, проверки как в CI, слияние в `main`. Обратная совместимость не нужна
(dev), но миграции переносят данные, где это дёшево.

---

## Как было

Разбор 2026-10-17 (три агента по бэку, правам и фронту):

- **JWT** `{ sub, email, type: member|employee }` без сессии: «выйти везде» и блокировка срабатывали только
  через 15 минут, когда истекал access. Подпись refresh при ротации не проверялась (только поиск хеша),
  повтор старого refresh не замечался.
- **Куки** токенов на `.paf-paf.app`, `Path=/` — уходили на сайт и все поддомены; `proxy.ts` CRM смотрел
  на них только как на признак входа.
- **Права**: четыре роли (`portal_owner|admin|manager|employee`), `AdminGuard` с захардкоженным списком,
  `@Admin()` ничего не делал. Любой сотрудник читал финансы, сканы документов, список команды, выпускал
  QR. В CRM меню роль не учитывало; страницы настроек у не-админов ловили 403.
- **Google и Telegram** зашиты в ~30 файлах: отдельные контроллеры, сценарии и ошибки на каждого.
  Ссылка из письма в Telegram-флоу — stateless JWT, работала многократно сутки. В CRM нет ни Telegram,
  ни экрана «Вход и безопасность».
- **Токены писем** — колонки в `User` (одна колонка на сброс и account-setup).
- **Фронт**: правило пароля в пяти местах, формы сброса и подтверждения — по две копии,
  `AuthProvider`/`MemberAuthProvider`, два «me» и т. д.
- Мёртвое: `@AllowUnconfirmed`, `CurrentUser`, дубли `CurrentMember/CurrentEmployee`, `RequireEmployeeJwtMobile`,
  `src/generated/prisma` (старый клиент в git), auth-код админки (`AuthProvider`, refresh в никуда).

---

## Фаза 1. Права сотрудников — `feat/crm-permissions`

### TASK-730: роли клуба и каталог прав `[x]` P0 — 2026-10-17

- [x] `PortalRole` (системные `owner/admin/manager/employee` + свои), `Employee.roleId`,
      `EmployeeInvitation.roleId`; enum `EmployeeRole` удалить. Миграция: роли каждому клубу, сотрудникам —
      роль по прежнему enum
- [x] Каталог прав `access/domain/permissions.ts`, наборы по умолчанию, полный доступ владельца и админа
      вычисляется
- [x] Роли при основании клуба (`ClubFoundingService`)

### TASK-731: гвард прав на всех маршрутах CRM `[x]` P0 — 2026-10-17

- [x] `MembershipGuard` грузит роль, в principal — `permissions`; `@RequirePermission(...)`, `PermissionGuard`
- [x] Права на все контроллеры CRM по таблице из AUTH_ARCHITECTURE §5.2; `AdminGuard`, `EmployeeRolesGuard`,
      `RequireManager/RequireAdmin/RequireEmployeeAdmin`, `MANAGER_ROLES`, `@Admin()` удалить
- [x] Проверки роли в сервисах (`place-staff-order`, ui-settings `forPortal`, `employees.service`) → права
      и правило «не шире своих прав»
- [x] e2e: матрица ролей (сотрудник не видит финансы и сканы, менеджер не трогает настройки, своя роль)

### TASK-732: роли и права в CRM `[x]` P0 — 2026-10-17

- [x] `me` отдаёт роль и права по клубам; `useCan`, `usePortalRole` → права
- [x] Меню, кнопки, разделы настроек по правам; страница без права — «Нет доступа»
- [x] «Настройки → Роли и права»: роли, матрица прав по разделам, своя роль, удаление роли без сотрудников
- [x] Выбор роли сотрудника и в приглашении — из ролей клуба

---

## Фаза 2. Сессии — `feat/auth-sessions`

### TASK-733: сессии вместо refresh-токенов `[x]` P0

- [x] `AuthSession` (аудитория, устройство, хеш и прежний хеш, способ входа, UA/IP, отзыв); `RefreshToken`
      удалить
- [x] Access `{ sub, sid, aud }`, refresh `{ sub, sid, aud, typ }` с проверкой подписи; `JWT_REFRESH_SECRET`
      обязателен
- [x] Ротация с окном гонки и отзывом при повторе (`reuse_detected`); api-client повторяет запрос на
      `refresh_superseded`
- [x] Гвард проверяет сессию в БД — отзыв действует сразу

### TASK-734: куки и гварды по аудиториям `[x]` P0

- [x] Токены — host-only на API, refresh `Path=/{aud}/auth`; подсказка `*_session` на `AUTH_HINT_COOKIE_DOMAIN`;
      `proxy.ts` по подсказке; `member_*` → `cabinet_*`
- [x] `@CrmSession/@CrmAuth/@CabinetSession/@CabinetAuth`, единый `SessionGuard` (куки или Bearer);
      мобильные варианты декораторов и мёртвые декораторы удалить
- [x] Env: убрать `*_AUTH_COOKIE_DOMAIN` и имена кук, добавить `AUTH_HINT_COOKIE_DOMAIN`
      (infra/dokploy/README, api.env.example)

### TASK-735: устройства в «Вход и безопасность» `[x]` P1

- [x] `GET /{aud}/account/sessions`, `DELETE …/sessions/:id`, «выйти на остальных» (API; экран — в TASK-738)

---

## Фаза 3. Способы входа — `feat/auth-identity`

### TASK-736: одноразовые токены писем `[x]` P0

- [x] `AuthToken` (purpose, hash, payload, срок, consumedAt); колонки токенов из `User` удалить
- [x] Подтверждение, сброс, account-setup, ссылка Telegram — через него, ссылка одноразовая

### TASK-737: реестр провайдеров `[x]` P0

- [x] `RedirectIdentityProvider` / `WidgetIdentityProvider`, `ExternalProfile`, Google и Telegram как адаптеры;
      Telegram по аудиториям (кабинет — `TG_CLIENT_BOT_*`, CRM — необязательный `TG_CRM_BOT_*`)
- [x] Общие сценарии: вход, привязка, отвязка, шаг «укажите почту», намерения; одни маршруты
      `/{aud}/auth/{provider}/…` и `/{aud}/auth/providers`
- [x] `@@unique([userId, provider])`, без перепривязки чужого способа

### TASK-738: «Вход и безопасность» в обоих приложениях `[x]` P1

- [x] `/{aud}/account/security`: пароль, способы входа из реестра, устройства, выйти везде (API обеих аудиторий)
- [x] Кабинет переведён на реестр (`methods[]`, `{provider}/verify`, `identity/*`)
- [x] Общий виджет `widgets/account-security` (клиент приложения через `AccountSecurityContext`): пароль,
      способы входа из `methods[]`, устройства с отзывом, выход везде; в CRM — `/{язык}/account/security` и
      плитка в меню аккаунта, вход возвращает туда же

### TASK-739: перебор и лимиты `[x]` P1

- [x] Регистрация участника: одинаковый ответ без id, письмо «вы уже зарегистрированы», пароль хешируется
      и для занятого адреса — по времени не отличить (TASK-665)
- [x] Неудачные входы по email в Redis: 10 за 15 минут закрывают вход паролем по адресу (429
      `too_many_attempts`), удачный вход сбрасывает; на любой адрес — одинаковое время ответа (TASK-667)

---

## Фаза 4. Фронт и уборка — `refactor/auth-frontend`

### TASK-740: общий auth-UI `[~]` P1

- [x] Правило пароля — одно (`shared/config/password-policy`, `passwordSchema`) на все формы
- [x] Кнопки провайдеров по реестру (`useProviderAvailable`): вход, регистрация, приглашение, вступление
- [x] api-client только на куках: стратегия «token» с localStorage удалена
- [ ] Формы сброса и подтверждения, плашка ошибки, «me или null», гвард сессии — по одному на оба
      приложения (сейчас копии CRM и кабинета; переделка вёрстки — отдельной задачей)
- [ ] Кнопка Telegram в CRM (бот `TG_CRM_BOT_*` и страница подтверждения почты на хосте CRM)

### TASK-741: мёртвый код `[x]` P2

- [x] `src/generated/prisma` (старый клиент с Token/EmployeeToken), закомментированный auth-код CRM и админки,
      `CurrentUser`, `AuthJwtPayload`, `RefreshTokenResponseDto`

---

## Фаза 5. Аудит — `audit/auth-2026-10`

### TASK-742: полный аудит auth и прав `[ ]` P0

- [ ] Матрица маршрутов × гварды × права; сценарии атак (перехват аккаунта, повтор токенов, перебор,
      межклубный доступ); итог — в security-audit.md
- [ ] `documentation/AUTHENTICATION.md` переписать по AUTH_ARCHITECTURE
