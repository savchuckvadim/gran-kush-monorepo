# Документация по модулю Storage

## Обзор

Модуль Storage предоставляет функциональность для загрузки, хранения и управления файлами в системе. Поддерживает два типа хранилищ: **public** (для публичного доступа) и **private** (для файлов клиентов, требующих аутентификации).

## Архитектура

### Типы хранилищ

- **PUBLIC** - файлы доступны публично (например, изображения продуктов)
- **PRIVATE** - файлы требуют аутентификации и привязаны к user ID (документы, подписи)

### Категории файлов

- `member-document` - документы членов клуба
- `member-signature` - подписи членов
- `product-image` - изображения продуктов
- `employee-avatar` - аватары сотрудников
- `member-avatar` - аватары членов
- `other` - прочие файлы

### Структура хранения

Файлы хранятся в следующей структуре:
```
storage/
├── public/
│   └── {userId}/
│       └── {uuid}.{ext}
└── private/
    └── {userId}/
        └── {uuid}.{ext}
```

### Асинхронная загрузка документов Member

Актуальный поток регистрации члена клуба:

1. `POST /lk/auth/member/register` создаёт `User + Member` и возвращает токены + `memberId`
2. `POST /lk/auth/member/files` принимает base64 data URL документов/подписи
3. API не сохраняет файлы синхронно: задача ставится в BullMQ очередь `member-files`
4. `MemberFilesProcessor` сохраняет файлы в `private` storage и пишет в БД только `storagePath`

Преимущества:
- нет переполнения `varchar` в БД от длинного base64
- регистрация и загрузка файлов разделены
- private-документы обрабатываются в фоне и могут безопасно ретраиться

## API Endpoints

### Загрузка файла

#### Member
**POST** `/storage/upload`

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Body (form-data):**
- `file` - файл для загрузки
- `category` - категория файла (member-document, member-signature, и т.д.)
- `storageType` (опционально) - тип хранилища (public/private). По умолчанию определяется автоматически

**Пример:**
```bash
curl -X POST http://localhost:3000/storage/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@document.pdf" \
  -F "category=member-document"
```

**Ответ:**
```json
{
  "id": "file-id",
  "userId": "user-id",
  "originalName": "document.pdf",
  "fileName": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
  "mimeType": "application/pdf",
  "size": 1024000,
  "storageType": "private",
  "category": "member-document",
  "path": "private/user-id/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
  "url": "http://localhost:3000/storage/private/user-id/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Employee
**POST** `/storage/upload/employee`

Аналогично Member, но требует аутентификации Employee.

### Получение файла

#### Member
**GET** `/storage/file/:id`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Ответ:** Файл в бинарном виде с соответствующими заголовками Content-Type.

#### Employee
**GET** `/storage/file/:id/employee`

Аналогично Member, но требует аутентификации Employee.

### Получение списка файлов

#### Member
**GET** `/storage/files` - все файлы пользователя
**GET** `/storage/files/:category` - файлы по категории

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Ответ:**
```json
[
  {
    "id": "file-id",
    "userId": "user-id",
    "originalName": "document.pdf",
    "fileName": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
    "mimeType": "application/pdf",
    "size": 1024000,
    "storageType": "private",
    "category": "member-document",
    "path": "private/user-id/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
    "url": "http://localhost:3000/storage/private/user-id/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Employee
**GET** `/storage/files/employee` - все файлы
**GET** `/storage/files/employee/:category` - файлы по категории

### Удаление файла

#### Member
**DELETE** `/storage/file/:id`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Ответ:**
```json
{
  "message": "File deleted successfully"
}
```

#### Employee
**DELETE** `/storage/file/:id/employee`

## Автоматическое определение типа хранилища

По умолчанию тип хранилища определяется автоматически на основе категории:

- `member-document` → **PRIVATE**
- `member-signature` → **PRIVATE**
- `product-image` → **PUBLIC**
- Остальные → **PRIVATE**

Можно явно указать `storageType` в запросе для переопределения.

## Безопасность

1. **Аутентификация:** Все операции требуют JWT токен (Member или Employee)
2. **Проверка владельца:** Пользователь может получить/удалить только свои файлы
3. **Private файлы:** Доступны только владельцу через аутентифицированные запросы
4. **Public файлы:** Доступны публично, но загрузка требует аутентификации

## Конфигурация

Переменные окружения (`.env`):

```env
STORAGE_ROOT=./storage          # Корневая директория для хранения файлов
BASE_URL=http://localhost:3000  # Базовый URL для генерации ссылок на файлы
```

## Использование в других модулях

### Пример: Обработка документов через очередь

```typescript
// В контроллере/сервисе
await memberFilesQueue.add("save-member-files", {
    memberId,
    documentType,
    documentFirst, // data:image/png;base64,...
    documentSecond,
    signature,
});

// В processor
const uploadResult = await storageService.uploadFile(
    {
        buffer,
        originalname: "identity-first.png",
        mimetype: "image/png",
    },
    `members/${memberId}`,
    StorageType.PRIVATE
);

await identityDocumentRepository.upsertByMemberTypeAndSide({
    memberId,
    type: documentType,
    side: "first",
    storagePath: uploadResult.relativePath,
});
```

## Репозитории

Все операции с базой данных выполняются через репозитории:

- **StorageFileRepository** (абстрактный класс)
- **StorageFilePrismaRepository** (реализация через Prisma)

## Расширение

Для добавления новых категорий файлов:

1. Добавьте новую категорию в `FileCategory` enum
2. При необходимости обновите логику определения типа хранилища в `StorageService.getDefaultStorageType()`

Пример:
```typescript
export enum FileCategory {
    // ... существующие
    PRODUCT_VIDEO = 'product-video',
    MEMBER_CERTIFICATE = 'member-certificate',
}
```
