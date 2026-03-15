# Web Application

## Структура проекта (FSD)

```
apps/web/
├── app/                    # Next.js app router (pages)
├── shared/                 # Переиспользуемые компоненты и утилиты
│   ├── ui/                 # UI компоненты-обертки
│   │   ├── card/          # Card компонент
│   │   ├── field/         # Field и FieldInput
│   │   ├── signature-canvas/ # Компонент подписи
│   │   └── file-upload/   # Компонент загрузки файлов
│   ├── lib/                # Утилиты
│   │   └── api.ts         # API client конфигурация
│   └── config/            # Конфигурация
│       ├── routes.ts      # Константы путей
│       └── i18n/          # Переводы (ru, en, es)
├── features/              # Функциональные возможности
│   └── auth/              # (TODO: создать)
│       ├── login/
│       └── register/
└── widgets/               # Композитные блоки
    └── header/            # (TODO: рефакторинг)
```

## Использование компонентов

### Из UI пакета

```typescript
import { Button, Card, Input } from "@workspace/ui/components/...";
```

### Из shared/ui (обертки)

```typescript
import { Card, FieldInput, FileUpload, SignatureCanvasField } from "@/shared/ui/...";
```

## Следующие шаги

См. `TASKS.md` для детального плана и `PROGRESS.md` для текущего прогресса.
