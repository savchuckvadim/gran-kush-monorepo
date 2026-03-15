# API Client

Пакет для автоматической генерации TypeScript клиента из OpenAPI спецификации.

## Использование

### Автоматическая генерация (рекомендуется)

1. Убедитесь, что API сервер запущен на `http://localhost:3000`
2. Запустите генерацию:
    ```bash
    pnpm generate
    ```

Этот скрипт:

- Скачает OpenAPI спецификацию с сервера в `openapi.json`
- Сгенерирует TypeScript клиент из локального файла

### Использование локального файла

Если у вас уже есть `openapi.json` файл:

```bash
pnpm generate:local
```

### Только скачивание спецификации

Если нужно только обновить `openapi.json`:

```bash
pnpm fetch:openapi
```

### Настройка URL API сервера

По умолчанию используется `http://localhost:3000`. Чтобы изменить:

```bash
API_URL=http://localhost:4000 pnpm generate
```

## Импорт в проектах

```typescript
import { DefaultService } from "@workspace/api-client/generated";
```

## Примечания

- Файл `openapi.json` автоматически добавляется в `.gitignore`
- Сгенерированные файлы находятся в `src/generated/`
