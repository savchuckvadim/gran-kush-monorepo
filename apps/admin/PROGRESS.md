# Progress Tracking

## ✅ Completed

- [x] Создан план задач в TASKS.md
- [x] Установлены зависимости (react-hook-form, zod, react-signature-canvas, next-intl, react-dropzone, clsx, tailwind-merge)
- [x] Настроены path aliases в tsconfig.json (@/shared)
- [x] Создана FSD структура папок
- [x] Созданы базовые компоненты-обертки в shared/ui:
    - [x] Card (обертка над @workspace/ui/components/card)
    - [x] Field и FieldInput (обертки над @workspace/ui/components/field)
    - [x] SignatureCanvasField (компонент для подписи)
    - [x] FileUpload (компонент для загрузки файлов)
- [x] Тема управляется через CSS переменные в @workspace/ui
- [x] Начата настройка i18n (структура папок и базовые переводы)

## 🚧 In Progress

- [ ] Настройка next-intl (провайдер, middleware)
- [ ] Создание формы логина
- [ ] Создание формы регистрации

## 📋 Next Steps (приоритет)

1. **Настроить next-intl полностью** (провайдер, middleware, хуки)
2. **Создать форму логина** (features/auth/login)
3. **Создать форму регистрации** (features/auth/register) - самое сложное
4. **Рефакторинг Header** (добавить переключатель языков)
5. **Улучшить Hero на главной** (полноэкранный с контейнером)

## 📝 Notes

- Все компоненты должны быть < 50 строк
- Использовать типизацию с ...rest
- Следовать FSD архитектуре
- Использовать компоненты из @workspace/ui, не дублировать
- В shared/ui только обертки с дополнительной логикой

## 📁 Текущая структура

```
apps/web/
├── shared/
│   ├── ui/
│   │   ├── card/          ✅
│   │   ├── field/         ✅
│   │   ├── signature-canvas/ ✅
│   │   └── file-upload/   ✅
│   └── config/
│       ├── routes.ts      ✅
│       └── i18n/          ✅
```
