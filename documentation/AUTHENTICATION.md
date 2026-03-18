# Документация по аутентификации и авторизации

## Обзор архитектуры

Система аутентификации полностью разделена на два независимых потока:
- **Member (Член клуба)** - для входа на сайт (LK)
- **Employee (Сотрудник)** - для входа в CRM и админку (если роль = `admin`)

### Модель User

`User` - минимальная модель, содержащая только данные для аутентификации:
- `id` - уникальный идентификатор
- `email` - email адрес (уникальный)
- `passwordHash` - хеш пароля (bcrypt, 10 раундов)
- `isActive` - статус активности
- `createdAt`, `updatedAt` - временные метки

**Важно:** User никогда не используется напрямую в бизнес-логике. Всегда работаем с `Member` или `Employee` через репозитории.

### Модель Member

`Member` - расширяет `User` данными члена клуба:
- Личные данные: `name`, `surname`, `phone`, `birthday`
- Данные членства: `membershipNumber`, `address`
- Статус заявки: `status` (inProgress, approved, rejected, pending)
- Связанные модели:
  - `IdentityDocument[]` - сканы документов (front/back)
  - `Signature` - скан подписи
  - `MemberMjStatus[]` - связи со статусами употребления (через таблицу `MjStatus`)
  - `MemberDocument[]` - связи с документами (через таблицу `Document`)

### Модель Employee

`Employee` - расширяет `User` данными сотрудника:
- Личные данные: `name`, `surname`, `phone`
- Рабочие данные: `role` (employee, manager, **admin**), `position`, `department`
- `isActive` - статус активности
- `lastLoginAt` - время последнего входа

**Роль `admin`:** Employee с ролью `admin` может входить в админку (`/admin/*`).

### Дополнительные модели

- **MjStatus** - справочник статусов употребления марихуаны (medical, mj, recreation)
- **MemberMjStatus** - связь many-to-many между Member и MjStatus
- **Document** - справочник типов документов (passport, id, driver_license и т.д.)
- **MemberDocument** - связь many-to-many между Member и Document с полями `number`, `issuedAt`, `expiresAt`, `issuedBy`

## Процесс аутентификации

### 1. Регистрация Member (Сайт)

#### Шаг 1: Проверка существования пользователя

**POST** `/lk/auth/member/check`

```json
{
  "email": "user@example.com"
}
```

**Процесс:**
1. Сервис `MembersService.checkUserExists()` вызывает `UserPrismaRepository.findByEmailWithRelations()`
2. Репозиторий выполняет запрос к БД через Prisma: `prisma.user.findUnique({ include: { employee: true, member: true } })`
3. Возвращается информация о существовании User и его ролях

**Ответ:**
```json
{
  "exists": true,
  "hasEmployee": true,
  "hasMember": false,
  "message": "You are already registered as an Employee. Do you want to register as a Member?"
}
```

#### Шаг 2: Регистрация

**POST** `/lk/auth/member/register?force=true`

**Процесс:**
1. `MembersService.createMember()` проверяет существование User через `UserPrismaRepository`
2. Если User существует как Employee и `force=false`, возвращается ошибка
3. Если User не существует:
   - Создается User через `UserPrismaRepository.create()` (только email и passwordHash)
   - Создается Member через `MemberRepository.create()` (все личные данные)
4. Создаются связи:
   - `MemberMjStatus` через `MemberMjStatusRepository` (для статусов isMedical, isMj, isRecreation)
   - `MemberDocument` через `MemberDocumentRepository` (для documentType и documentNumber)
5. Генерируются токены через `MemberAuthService.generateTokens()`
6. Refresh token сохраняется в БД в таблицу `tokens`
7. В ответ возвращается `memberId` для последующей загрузки файлов

**Ответ:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "memberId": "member_id",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  },
  "warning": {
    "message": "You are already registered as an Employee...",
    "hasEmployee": true
  }
}
```

#### Шаг 3: Асинхронная загрузка документов и подписи

**POST** `/lk/auth/member/files`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Body (JSON):**
```json
{
  "documentType": "passport",
  "documentFirst": "data:image/png;base64,...",
  "documentSecond": "data:image/png;base64,...",
  "signature": "data:image/png;base64,..."
}
```

**Процесс:**
1. Контроллер валидирует payload и добавляет задачу в очередь `member-files` (BullMQ)
2. `MemberFilesProcessor` в фоне:
   - декодирует data URL в `Buffer`
   - сохраняет файлы в `StorageService` с `StorageType.PRIVATE`
   - записывает в БД только `storagePath` (относительный путь), а не base64
3. Для повторной отправки используется upsert:
   - `IdentityDocument` по ключу `(memberId, type, side)`
   - `Signature` по ключу `memberId`

**Ответ:**
```json
{
  "queued": true,
  "jobId": "214"
}
```

### 2. Вход Member (Сайт)

**POST** `/lk/auth/login`

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Процесс:**
1. `MemberLocalAuthGuard` перехватывает запрос
2. `MemberLocalStrategy.validate()` вызывает `MemberAuthService.validateMember()`
3. `MemberAuthService.validateMember()`:
   - Получает User через `UserPrismaRepository.findByEmailWithRelations()`
   - Проверяет наличие Member у User
   - Сравнивает пароль через `bcrypt.compare()`
   - Проверяет `isActive` для User и Member
4. Если валидация успешна, `MemberAuthService.login()`:
   - Генерирует токены через `generateTokens()`
   - Сохраняет refresh token в БД (таблица `tokens`)
   - Возвращает оба токена клиенту

**Ответ:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John",
    "phone": "+1234567890"
  }
}
```

### 3. Использование Access Token

**GET** `/lk/auth/me`

**Заголовок:**
```
Authorization: Bearer <accessToken>
```

**Процесс:**
1. `MemberJwtAuthGuard` перехватывает запрос
2. Извлекает токен из заголовка `Authorization: Bearer <token>`
3. `MemberJwtStrategy.validate()`:
   - Декодирует JWT токен (проверяет подпись и срок действия)
   - Извлекает payload: `{ sub: member_id, userId: user_id, email: "...", type: "member" }`
   - Вызывает `MemberAuthService.validateJwtPayload()`
   - Проверяет существование Member в БД через `MemberRepository.findById()`
   - Проверяет `isActive` для Member и User
4. Если валидация успешна, Member доступен через `@CurrentMember()` декоратор
5. Контроллер возвращает полную информацию Member

**Ответ:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John",
  "phone": "+1234567890",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 4. Обновление Access Token

**POST** `/lk/auth/refresh`

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Процесс:**
1. `MemberAuthService.refreshToken()`:
   - Ищет refresh token в БД через `PrismaService.token.findUnique()`
   - Проверяет срок действия (`expiresAt`)
   - Проверяет активность User и Member
   - Декодирует refresh token для получения payload
   - Генерирует новый access token с тем же payload
   - **НЕ создает новый refresh token** (старый остается валидным)
2. Возвращает новый access token

**Ответ:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5. Выход

**POST** `/lk/auth/logout`

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Процесс:**
1. `MemberAuthService.logout()`:
   - Удаляет refresh token из БД через `PrismaService.token.deleteMany()`
2. Токен больше не может быть использован для обновления access token

**Ответ:**
```json
{
  "message": "Logged out successfully"
}
```

## Генерация и хранение токенов

### Откуда берутся токены?

#### 1. Access Token (JWT)

**Генерация:**
- Генерируется на сервере при входе/регистрации
- Используется библиотека `@nestjs/jwt` (JwtService)
- Подписывается секретным ключом из `JWT_SECRET`
- Содержит payload с данными пользователя
- **НЕ хранится в БД** - полностью stateless

**Структура payload для Member:**
```json
{
  "sub": "member_id",        // ID Member
  "userId": "user_id",       // ID User
  "email": "user@example.com",
  "type": "member",          // Тип токена для различения
  "iat": 1234567890,         // Время создания
  "exp": 1234567890          // Время истечения
}
```

**Структура payload для Employee:**
```json
{
  "sub": "employee_id",      // ID Employee
  "userId": "user_id",        // ID User
  "email": "user@example.com",
  "name": "Employee Name",
  "role": "employee",        // employee, manager, admin
  "type": "employee",        // Тип токена для различения
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Где хранится:**
- На клиенте (localStorage, sessionStorage, cookies, memory)
- Передается в заголовке `Authorization: Bearer <token>`

**Время жизни:**
- Настраивается через `JWT_ACCESS_TOKEN_EXPIRES_IN` (по умолчанию: `15m`)
- После истечения требуется обновление через refresh token

#### 2. Refresh Token (JWT)

**Генерация:**
- Генерируется на сервере одновременно с access token
- Используется тот же `JwtService`, но с другими настройками:
  - Секрет: `JWT_REFRESH_SECRET` (или `JWT_SECRET` если не указан)
  - Время жизни: `JWT_REFRESH_TOKEN_EXPIRES_IN` (по умолчанию: `7d`)
- Содержит тот же payload, что и access token

**Где хранится:**
- **В базе данных:**
  - Для Member: таблица `tokens` (связь с `User`)
  - Для Employee: таблица `employee_tokens` (связь с `Employee`)
- На клиенте (для отправки при обновлении токена)

**Структура записи в БД:**
```sql
-- Таблица tokens (для Member)
id: uuid
token: string (JWT refresh token)
userId: uuid (FK -> users.id)
expiresAt: datetime
createdAt: datetime

-- Таблица employee_tokens (для Employee)
id: uuid
token: string (JWT refresh token)
employeeId: uuid (FK -> employees.id)
expiresAt: datetime
createdAt: datetime
```

**Процесс сохранения:**
1. После генерации refresh token сохраняется в БД через Prisma
2. Для Member: `prisma.token.create({ token, userId, expiresAt })`
3. Для Employee: `prisma.employeeToken.create({ token, employeeId, expiresAt })`
4. При удалении User/Employee все связанные токены удаляются каскадно (`onDelete: Cascade`)

**Валидация:**
- При обновлении access token проверяется:
  1. Существование записи в БД
  2. Срок действия (`expiresAt`)
  3. Активность User/Employee
  4. Подпись JWT токена

### Процесс генерации токенов (детально)

```typescript
// Пример из MemberAuthService.generateTokens()

// 1. Формирование payload
const payload: MemberJwtPayload = {
    sub: member.id,           // ID Member
    userId: user.id,          // ID User
    email: user.email,
    type: 'member',
};

// 2. Получение секретов и времени жизни из конфигурации
const jwtSecret = configService.get<string>('JWT_SECRET');
const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET') || jwtSecret;
const accessTokenExpiresIn = configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') || '15m';
const refreshTokenExpiresIn = configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') || '7d';

// 3. Генерация токенов через JwtService
const [accessToken, refreshToken] = await Promise.all([
    jwtService.signAsync(payload, { secret: jwtSecret, expiresIn: accessTokenExpiresIn }),
    jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: refreshTokenExpiresIn }),
]);

// 4. Вычисление даты истечения refresh token
const expiresAt = new Date();
const expiresInDays = parseInt(refreshTokenExpiresIn.replace('d', ''), 10) || 7;
expiresAt.setDate(expiresAt.getDate() + expiresInDays);

// 5. Сохранение refresh token в БД
await prisma.token.create({
    data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
    },
});

// 6. Возврат обоих токенов клиенту
return { accessToken, refreshToken };
```

## Эндпоинты аутентификации

### Member (Сайт - LK)

#### Регистрация

**POST** `/lk/auth/member/check`
- Проверка существования пользователя перед регистрацией
- Возвращает информацию о том, является ли пользователь Employee

**POST** `/lk/auth/member/register?force=true`
- Регистрация нового Member
- Создает `User` и `Member` с полными данными
- Создает связи с `MjStatus` и `Document`
- Если User уже существует как Employee, требуется `force=true`
- Возвращает токены и предупреждение, если User был Employee

#### Вход и управление сессией

**POST** `/lk/auth/login`
- Вход Member (только для зарегистрированных Member)
- Использует `MemberLocalAuthGuard` и `MemberLocalStrategy`
- Возвращает `accessToken` и `refreshToken`

**POST** `/lk/auth/refresh`
- Обновление access token через refresh token
- Проверяет refresh token в базе данных (таблица `tokens`)
- Возвращает новый `accessToken`

**POST** `/lk/auth/logout`
- Выход (удаление refresh token из БД)
- Требует `refreshToken` в теле запроса

**GET** `/lk/auth/me`
- Получение информации о текущем Member
- Использует `MemberJwtAuthGuard` и `MemberJwtStrategy`
- Требует `Authorization: Bearer <accessToken>` в заголовке
- Возвращает полную информацию Member с User

### Employee (CRM)

#### Регистрация

**POST** `/crm/auth/employee/register`
- Регистрация нового Employee
- **Требует авторизации:** `EmployeeJwtAuthGuard` + `AdminGuard`
- **Доступ:** Только для сотрудников с ролью `admin`
- Создает `User` и `Employee` с полными данными
- Если User уже существует как Member, можно создать Employee

#### Вход и управление сессией

**POST** `/crm/auth/login`
- Вход Employee (только для зарегистрированных Employee)
- Использует `EmployeeLocalAuthGuard` и `EmployeeLocalStrategy`
- Возвращает `accessToken` и `refreshToken`

**POST** `/crm/auth/refresh`
- Обновление access token через refresh token
- Проверяет refresh token в базе данных (таблица `employee_tokens`)
- Возвращает новый `accessToken`

**POST** `/crm/auth/logout`
- Выход (удаление refresh token из БД)
- Требует `refreshToken` в теле запроса

**GET** `/crm/auth/me`
- Получение информации о текущем Employee
- Использует `EmployeeJwtAuthGuard` и `EmployeeJwtStrategy`
- Требует `Authorization: Bearer <accessToken>` в заголовке
- Возвращает полную информацию Employee с User

## Архитектура модулей аутентификации

### Структура модулей

Вся аутентификация разделена на два независимых модуля:

#### `modules/auth/employees` - Аутентификация сотрудников (CRM)

**Расположение:** `apps/api/src/modules/auth/employees/`

**Структура:**
```
auth/employees/
├── api/
│   ├── controllers/
│   │   ├── employee-auth.controller.ts      # login, logout, refresh, me
│   │   └── employee-registration.controller.ts  # register (только для админов)
│   ├── decorators/
│   │   └── current-employee.decorator.ts
│   └── dto/
│       └── [DTO для employees]
├── application/
│   └── services/
│       ├── employee-auth.service.ts
│       └── employee-registration.service.ts
├── infrastructure/
│   ├── guards/
│   │   ├── employee-jwt-auth.guard.ts
│   │   ├── employee-local-auth.guard.ts
│   │   └── admin.guard.ts
│   └── strategies/
│       ├── employee-jwt.strategy.ts
│       └── employee-local.strategy.ts
└── employee-auth.module.ts
```

**Экспорты:**
- Guards: `EmployeeJwtAuthGuard`, `EmployeeLocalAuthGuard`, `AdminGuard`
- Decorators: `CurrentEmployee`, `Admin`
- Services: `EmployeeAuthService`, `EmployeeRegistrationService`
- DTOs: все DTO для employees

#### `modules/auth/members` - Аутентификация членов (Site/LK)

**Расположение:** `apps/api/src/modules/auth/members/`

**Структура:**
```
auth/members/
├── api/
│   ├── controllers/
│   │   ├── member-auth.controller.ts        # login, logout, refresh, me
│   │   └── member-registration.controller.ts # register (публичный)
│   ├── decorators/
│   │   └── current-member.decorator.ts
│   └── dto/
│       └── [DTO для members]
├── application/
│   └── services/
│       ├── member-auth.service.ts
│       └── member-registration.service.ts
├── infrastructure/
│   ├── guards/
│   │   ├── member-jwt-auth.guard.ts
│   │   └── member-local-auth.guard.ts
│   └── strategies/
│       ├── member-jwt.strategy.ts
│       └── member-local.strategy.ts
└── member-auth.module.ts
```

**Экспорты:**
- Guards: `MemberJwtAuthGuard`, `MemberLocalAuthGuard`
- Decorators: `CurrentMember`
- Services: `MemberAuthService`, `MemberRegistrationService`
- DTOs: все DTO для members

### Использование в других модулях

#### Импорт guards и декораторов

```typescript
// Для Employee операций
import { EmployeeJwtAuthGuard, AdminGuard, Admin, CurrentEmployee } from "@auth/employees";

// Для Member операций
import { MemberJwtAuthGuard, CurrentMember } from "@auth/members";
```

#### Пример использования в контроллере

```typescript
// CRM контроллер (для сотрудников)
@Controller("crm/members")
@UseGuards(EmployeeJwtAuthGuard)  // Требуется авторизация сотрудника
export class CrmMembersController {
    @Get()
    async list() {
        // Доступно всем сотрудникам
    }

    @Post()
    @UseGuards(AdminGuard)
    @Admin()
    async create() {
        // Доступно только админам
    }
}

// LK контроллер (для членов)
@Controller("lk/members")
@UseGuards(MemberJwtAuthGuard)  // Требуется авторизация члена
export class LkMembersController {
    @Get("me")
    async getMe(@CurrentMember() member: Member) {
        // Член может получить только свои данные
    }
}
```

## Guards и Strategies

### Member

- **MemberLocalAuthGuard** - для входа по email/password
  - Использует `MemberLocalStrategy`
  - Вызывает `MemberAuthService.validateMember()`
  - Расположение: `@auth/members/infrastructure/guards/member-local-auth.guard.ts`
- **MemberJwtAuthGuard** - для защищенных эндпоинтов
  - Использует `MemberJwtStrategy`
  - Извлекает токен из заголовка `Authorization: Bearer <token>`
  - Вызывает `MemberAuthService.validateJwtPayload()`
  - Расположение: `@auth/members/infrastructure/guards/member-jwt-auth.guard.ts`
- **MemberLocalStrategy** - валидация email/password для Member
  - Расположение: `@auth/members/infrastructure/strategies/member-local.strategy.ts`
- **MemberJwtStrategy** - валидация JWT токена для Member
  - Расположение: `@auth/members/infrastructure/strategies/member-jwt.strategy.ts`

### Employee

- **EmployeeLocalAuthGuard** - для входа по email/password
  - Использует `EmployeeLocalStrategy`
  - Вызывает `EmployeeAuthService.validateEmployee()`
  - Расположение: `@auth/employees/infrastructure/guards/employee-local-auth.guard.ts`
- **EmployeeJwtAuthGuard** - для защищенных эндпоинтов
  - Использует `EmployeeJwtStrategy`
  - Извлекает токен из заголовка `Authorization: Bearer <token>`
  - Вызывает `EmployeeAuthService.validateJwtPayload()`
  - Расположение: `@auth/employees/infrastructure/guards/employee-jwt-auth.guard.ts`
- **AdminGuard** - проверка роли admin
  - Работает вместе с `EmployeeJwtAuthGuard`
  - Проверяет `employee.role === "admin"`
  - Расположение: `@auth/employees/infrastructure/guards/admin.guard.ts`
- **EmployeeLocalStrategy** - валидация email/password для Employee
  - Расположение: `@auth/employees/infrastructure/strategies/employee-local.strategy.ts`
- **EmployeeJwtStrategy** - валидация JWT токена для Employee
  - Расположение: `@auth/employees/infrastructure/strategies/employee-jwt.strategy.ts`

## Декораторы

- `@CurrentMember()` - получение текущего Member из запроса (после прохождения `MemberJwtAuthGuard`)
  - Расположение: `@auth/members/api/decorators/current-member.decorator.ts`
  - Импорт: `import { CurrentMember } from "@auth/members";`
- `@CurrentEmployee()` - получение текущего Employee из запроса (после прохождения `EmployeeJwtAuthGuard`)
  - Расположение: `@auth/employees/api/decorators/current-employee.decorator.ts`
  - Импорт: `import { CurrentEmployee } from "@auth/employees";`
- `@Admin()` - пометка эндпоинта как доступного только для админов
  - Работает вместе с `AdminGuard`
  - Импорт: `import { Admin } from "@auth/employees";`
- `@Public()` - пометка эндпоинта как публичного (без аутентификации)
  - Расположение: `@common/decorators/auth/public.decorator.ts`

## Разделение бизнес-логики и аутентификации

### Модули бизнес-логики

**`modules/members`** - Бизнес-логика для членов клуба
- **Контроллеры:**
  - `CrmMembersController` (`/crm/members/*`) - для сотрудников CRM
    - Защита: `EmployeeJwtAuthGuard`
    - Операции создания/обновления: `AdminGuard` + `@Admin()`
  - `LkMembersController` (`/lk/members/*`) - для членов (только свои данные)
    - Защита: `MemberJwtAuthGuard`
    - Доступ только к собственным данным
- **Сервисы:**
  - `MembersService` - бизнес-логика работы с членами
  - `MemberFilesService` - обработка файлов членов

**`modules/employees`** - Бизнес-логика для сотрудников
- **Сервисы:**
  - `EmployeesService` - бизнес-логика работы с сотрудниками

**Важно:** Модули `modules/members` и `modules/employees` содержат только бизнес-логику (CRUD операции). Вся аутентификация находится в `modules/auth/*`.

## Репозитории

Все операции с базой данных выполняются через репозитории (не напрямую через Prisma):

- **UserPrismaRepository** - работа с User
- **MemberRepository** - работа с Member
- **EmployeeRepository** - работа с Employee
- **MjStatusRepository** - работа с MjStatus
- **MemberMjStatusRepository** - работа со связями Member-MjStatus
- **DocumentRepository** - работа с Document
- **MemberDocumentRepository** - работа со связями Member-Document

**Принцип:** Сервисы используют репозитории, репозитории используют Prisma. Прямой доступ к Prisma из сервисов запрещен.

## Безопасность

### Разделение доступа

- **Member** может входить только через `/lk/auth/*` эндпоинты
- **Member** может получать только свои данные через `/lk/members/me`
- **Employee** может входить только через `/crm/auth/*` эндпоинты
- **Employee** может просматривать всех членов через `/crm/members/*`
- **Employee с ролью `admin`** может:
  - Создавать новых сотрудников через `/crm/auth/employee/register`
  - Создавать/обновлять/удалять членов через `/crm/members/*`
  - Входить в админку (`/admin/*`)
- Member **недоступен** в CRM, Employee **недоступен** на сайте

### Валидация

- При входе проверяется наличие соответствующей роли (Member или Employee)
- При валидации JWT проверяется тип токена (`type: 'member'` или `type: 'employee'`)
- Refresh tokens проверяются в базе данных перед обновлением access token
- Проверяется активность User и Member/Employee (`isActive`)

### Пароли

- Пароли хешируются с помощью `bcrypt` (10 раундов)
- Пароли никогда не возвращаются в ответах API
- При регистрации пароль хешируется перед сохранением в БД

### Токены

- Access tokens имеют короткий срок жизни (15 минут)
- Refresh tokens имеют длинный срок жизни (7 дней)
- Refresh tokens хранятся в БД и могут быть отозваны
- При удалении User/Employee все связанные токены удаляются каскадно

## Примеры использования

### Регистрация Member

```bash
# 1. Проверка существования
POST /lk/auth/member/check
Content-Type: application/json

{
  "email": "user@example.com"
}

# Ответ:
{
  "exists": true,
  "hasEmployee": true,
  "hasMember": false,
  "message": "You are already registered as an Employee. Do you want to register as a Member?"
}

# 2. Регистрация (если User уже Employee, используйте ?force=true)
POST /lk/auth/member/register?force=true
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John",
  "surname": "Doe",
  "phone": "+1234567890",
  "birthday": "1990-01-01",
  "documentType": "passport",
  "documentNumber": "123456789",
  "documentFirst": "/storage/documents/front.jpg",
  "documentSecond": "/storage/documents/back.jpg",
  "signature": "/storage/signatures/signature.jpg",
  "isMedical": true,
  "isMj": false,
  "isRecreation": false
}

# Ответ:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  },
  "warning": {
    "message": "You are already registered as an Employee...",
    "hasEmployee": true
  }
}
```

### Вход Member

```bash
POST /lk/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

# Ответ:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John",
    "phone": "+1234567890"
  }
}
```

### Использование токена

```bash
# Получение информации о текущем Member
GET /lk/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Ответ:
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John",
  "phone": "+1234567890",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

# Обновление токена (когда access token истек)
POST /lk/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# Ответ:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# Выход
POST /lk/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# Ответ:
{
  "message": "Logged out successfully"
}
```

## Миграция базы данных

После изменения схемы Prisma необходимо выполнить миграцию:

```bash
cd apps/api
pnpm prisma migrate dev --name <migration_name>
pnpm prisma generate
```

## Переменные окружения

```env
# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here  # Опционально, по умолчанию = JWT_SECRET
JWT_ACCESS_TOKEN_EXPIRES_IN=15m                  # Время жизни access token
JWT_REFRESH_TOKEN_EXPIRES_IN=7d                  # Время жизни refresh token

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Bootstrap root admin (CRM)
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_EMAIL=admin@company.com
BOOTSTRAP_ADMIN_PASSWORD=ChangeMe_StrongPassword
BOOTSTRAP_ADMIN_NAME=Root
BOOTSTRAP_ADMIN_FORCE_PASSWORD_RESET=false
```

### Bootstrap admin seed

`BOOTSTRAP_ADMIN_ENABLED=true` включает сценарий посева root-admin.  
Если флаг `false` (или не задан), seed-скрипт ничего не создает и завершается без ошибок.

Команды:

```bash
cd apps/api

# Только посев root-admin (без миграций)
pnpm prisma:seed:admin

# Стандартный prisma seed (в проекте он также запускает seed-admin)
pnpm prisma:seed
```

Рекомендованный production flow:
1. `pnpm prisma:migrate:deploy`
2. `pnpm prisma:seed:admin`
3. Убедиться, что root-admin может войти в CRM
4. Выключить `BOOTSTRAP_ADMIN_ENABLED` или удалить bootstrap-пароль из env

## Схема работы токенов

```
┌─────────────┐
│   Клиент    │
└──────┬──────┘
       │
       │ 1. POST /login (email, password)
       ▼
┌─────────────────┐
│  Auth Service   │
│  - Валидация    │
│  - Генерация    │
└──────┬──────────┘
       │
       │ 2. Генерация токенов
       ▼
┌─────────────────┐
│   JwtService    │
│  - Access Token │
│  - Refresh Token│
└──────┬──────────┘
       │
       │ 3. Сохранение refresh token
       ▼
┌─────────────────┐
│   Database      │
│  - tokens       │
│  - employee_    │
│    tokens       │
└─────────────────┘
       │
       │ 4. Возврат токенов
       ▼
┌─────────────┐
│   Клиент    │
│  - Access   │
│  - Refresh  │
└──────┬──────┘
       │
       │ 5. Использование access token
       ▼
┌─────────────────┐
│ Protected Route │
│  - JWT Guard    │
│  - Validation   │
└─────────────────┘
       │
       │ 6. Access token истек
       ▼
┌─────────────────┐
│  POST /refresh  │
│  - Проверка     │
│  - Новый token  │
└─────────────────┘
```
