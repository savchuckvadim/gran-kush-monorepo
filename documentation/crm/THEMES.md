# Темы CRM

Авторские темы оформления CRM. Clásico — прежняя тема CRM, она же тема по умолчанию; её токены в
`globals.css` не менялись. Ещё 12 тем: PafPaf, Nagual, Unicornio, Galaxia lejana, Asceta, Cristal,
Vapor, Brasa, Trap, 90s, Grind, Mediterráneo.

## Где выбрать

- **Настройки → Оформление** — `/{locale}/{portal}/crm/settings/appearance`.
- Кнопка с палитрой в шапке, рядом с переключателем светлой и тёмной темы: та же галерея в боковой
  панели.

## Как устроено

- **Тема** — атрибут `data-skin` на `<html>`. Нет атрибута — Clásico, токены из `globals.css`.
  Светлый и тёмный режим — класс `.dark` от next-themes, как раньше.
- **Токены и эффекты** — `packages/ui/src/styles/skins.css`, подключён из `globals.css` после
  блоков `:root` и `.dark`.
    - Токены задают селекторы `[data-skin="x"]` и `[data-skin="x"].dark`. Они не привязаны к `:root`,
      поэтому превью в галерее несёт свой `data-skin`.
    - Блок `[data-skin="clasico"]` повторяет `globals.css` только ради превью внутри другой темы.
    - Эффекты привязаны к `:root[data-skin="x"]` и к хукам `data-slot`: `card`, `card-title`,
      `button` (+ `data-variant`), `badge`, `dialog-title`, `sidebar`, `sidebar-link` (+ `data-active`),
      `app-header`.
- **Шрифты** — `apps/crm/app/fonts.ts`, `next/font/google`.
    - У каждого шрифта своя переменная на `<html>`: `--font-geist`, `--font-onest` и т. д.
    - `globals.css` направляет `--font-sans` и `--font-mono` на Geist, тема переназначает их.
    - Все шрифты тем — с `preload: false`: файл грузится, когда текст в этой теме или её превью его
      требует.
- **Состояние.**
    - `modules/shared/config/skins.ts` — список тем: режимы, теги, `forcesEco`, свои названия режимов.
    - `modules/shared/lib/skin/` — хранилище, store для `useSyncExternalStore`, inline-скрипты.
    - `SkinProvider` и `useSkin()` — `skin`, `setSkin`, `eco`, `setEco`, `isEcoActive`.
- **Без вспышки при загрузке.**
    - `SKIN_BOOT_SCRIPT` в `<head>` до первой отрисовки ставит `data-skin` и `eco` из localStorage.
    - Скрипт next-themes применяет сохранённый режим ещё до гидрации. Сразу после него
      `SkinModeScript` возвращает теме с одним режимом её режим.
    - После гидрации режим держит next-themes через `forcedTheme`.
- **Темы с одним режимом.** Только тёмная: Asceta, Brasa, Trap, Grind. Только светлая: Unicornio,
  Vapor, 90s. Для них переключатель в шапке и «Режим» в настройках выключены с подсказкой.
- **Энергосбережение** — класс `eco` на `<html>`.
    - Выключает анимации (кроме спиннеров `animate-spin`), размытие, фоновый слой и canvas.
    - Стеклянные темы получают непрозрачные карточки.
    - В Asceta оно включено всегда.
    - `prefers-reduced-motion` останавливает анимации эффектов, звёзды рисуются одним кадром.
- **Фоновый слой** — `SkinBackdrop` в `modules/shared/ui/SkinBackdrop`. Стоит в `CrmShell` и в
  обоих auth-лейаутах.
    - Слои показывает CSS по `data-skin`, поэтому они видны сразу после загрузки.
    - JS нужен только звёздам Galaxia: параллакс за курсором и прыжок в гиперпространство при смене
      раздела.
- **Хранение** — `localStorage`: `crm.skin`, `crm.eco`.

## Как добавить тему

1. `skins.css` — блок `[data-skin="id"]`, а если у темы два режима, ещё `[data-skin="id"].dark`.
    - Обязательные токены: `--radius`, `--background`, `--foreground`, `--card`, `--primary`,
      `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`,
      `--destructive`, `--border`, `--chart-1`…`--chart-5`, `--success`, `--warning`.
    - По желанию: шрифты, `--display-weight`, `--display-tracking`, `--display-case`,
      `--shadow-card`.
    - Остальные токены выводит базовый блок `[data-skin]`.
2. Новый шрифт — в `app/fonts.ts`: своя переменная, `preload: false`, кириллица, если она у шрифта
   есть. Добавить его в `fontVariables`.
3. `SKIN_IDS` и `SKIN_MAP` в `modules/shared/config/skins.ts`.
4. Тексты `crm.appearance.skins.<id>`: `name`, `description`, а при `hasModeNames` ещё `modes.light`
   и `modes.dark`. Во всех трёх локалях.
5. Проверить контраст WCAG AA (4,5:1): текст на фоне и на карточке, текст на основной кнопке,
   бейджи, активный пункт меню.

## TASK-410: тема клуба и личная тема

- Тема клуба по умолчанию станет полем портала, личная тема — настройкой пользователя в API.
- Источник меняется в `modules/shared/lib/skin/skin-storage.ts`: `readSkinPreferences` и
  `writeSkinPreferences`.
- Тема клуба передаётся в `resolveSkin(personal, clubDefault)`.
- Inline-скрипту тогда нужна тема клуба с сервера (cookie или атрибут на `<html>`). Иначе до
  гидрации будет видна Clásico.

## Фаза 2

- Эффекты на событиях:
    - Unicornio — конфетти при входе, искры за курсором;
    - Nagual — светлячки, «дыхание» при закрытии кассы;
    - 90s — счётчики-перелистыватели, таймкод VHS в журнале;
    - Grind — штамп «Denegado» и тряска карточки;
    - Asceta — затемнение через 20 с без действий.
- Перетекающие рамки и перелив цифр на KPI и панели сканирования (PafPaf, Unicornio, Vapor). Для них
  нужны хуки в этих виджетах; сейчас есть только рамка Vapor при наведении на карточку.
- Граффити-теги у заголовков (Trap, шрифт Rubik Spray Paint).
- Своё фото клуба в Cristal.
- Цвета статусов. Бейджи написаны на палитре Tailwind (`text-green-700` и т. п.), а не на токенах
  `--success` и `--warning`. В тёмных темах они бледные, как и в тёмной Clásico.
- Тема формы регистрации, тема клуба и личная тема (TASK-410).

## Ловушки

- **Переменные next/font — на `<html>`.** Если `--font-sans` задаёт `<body>`, то
  `var(--font-onest)` из темы на `<html>` до текста не доходит.
- **Pirata One — только первая гарнитура из стека next/font.** next/font дописывает подогнанный
  локальный Arial, в нём есть кириллица, и до Ruslan Display стек не доходит. Turbopack игнорирует
  `adjustFontFallback: false`, поэтому `--font-pirata` ставится на `<html>` через `fontStyle` из
  `app/fonts.ts`.
- **`backdrop-filter` на карточке делает её содержащим блоком для `fixed`-потомков.** Модалка
  внутри карточки (`MemberProfileEditModal`) сжалась бы до размеров карточки. Поэтому размытие
  стоит на `::before`.
- **Шапка CRM — `sticky` с `z-index: auto`.** Позиционированные карточки прокручиваются поверх неё.
  В темах у шапки `z-index: 30`.
- **`var()` в кастомном свойстве подставляется там, где оно объявлено.** В прототипе `--flow`
  с `var(--angle)` вычислялся на `<html>`, и рамка не вращалась. Теперь градиент собирается на
  анимируемом элементе из `--flow-stops`.
