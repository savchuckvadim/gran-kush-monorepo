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

### TASK-737: реестр провайдеров `[ ]` P0

- [ ] `IdentityProviderAdapter`, `ExternalProfile`, Google и Telegram как адаптеры; Telegram по аудиториям
      (`TG_CABINET_BOT_*`, `TG_CRM_BOT_*`)
- [ ] Общие сценарии: вход, привязка, отвязка, шаг «укажите почту», намерения; одни маршруты
      `/{aud}/auth/{provider}/…` и `/{aud}/auth/providers`
- [ ] `@@unique([userId, provider])`, без перепривязки чужого способа

### TASK-738: «Вход и безопасность» в обоих приложениях `[ ]` P1

- [ ] `/{aud}/account/security`: пароль, способы входа из реестра, устройства, выйти везде
- [ ] Общий виджет на фронте; в CRM — пункт в меню аккаунта

### TASK-739: перебор и лимиты `[ ]` P1

- [ ] Регистрация участника: одинаковый ответ, письмо «вы уже зарегистрированы» (TASK-665)
- [ ] Неудачные входы по email в Redis (TASK-667)

---

## Фаза 4. Фронт и уборка — `refactor/auth-frontend`

### TASK-740: общий auth-UI `[ ]` P1

- [ ] Правило пароля, формы сброса и подтверждения, плашка ошибки, безопасный `from`, «me или null»,
      гвард сессии — по одному на оба приложения
- [ ] `SignInMethods` по реестру провайдеров; кнопки на входе, регистрации, приглашении, вступлении

### TASK-741: мёртвый код `[ ]` P2

- [ ] `src/generated/prisma`, auth-код админки, дубли декораторов, `CurrentUser`

---

## Фаза 5. Аудит — `audit/auth-2026-10`

### TASK-742: полный аудит auth и прав `[ ]` P0

- [ ] Матрица маршрутов × гварды × права; сценарии атак (перехват аккаунта, повтор токенов, перебор,
      межклубный доступ); итог — в security-audit.md
- [ ] `documentation/AUTHENTICATION.md` переписать по AUTH_ARCHITECTURE
