# Письма

Модуль `apps/api/src/modules/mail`. Письма рендерятся из React-шаблонов (`@react-email/components`),
ставятся в очередь BullMQ `mail` и отправляются воркером `MailProcessor` через SMTP-транспорт.

## Устройство

| Слой | Где | Что делает |
|---|---|---|
| Сервис | `application/services/mail.service.ts` | По одному методу на письмо: рендерит шаблон и кладёт в очередь (`enqueue`). `sendEmail` — отправка из воркера |
| Шаблоны | `templates/*.template.tsx` | Тонкие: берут тексты по языку и собирают `EmailLayout` |
| Рамка | `templates/email-layout.tsx` | Единый вид всех писем в стиле сайта paf-paf.app: чёрная шапка со знаком «paf paf», заголовок, абзацы, блок с кнопкой, подвал со ссылкой на сайт. Только inline-стили: Tailwind и SVG почтовые клиенты режут |
| Тексты | `consts/*-email.ts` | По языкам `ru`/`es`/`en`, функции для подстановок (имя, клуб, год). Бренд — `MAIL_BRAND_*` в `mail.constants.ts` до пакета бренда (TASK-531) |
| Темы | `consts/mail.constants.ts` → `EMAIL_SUBJECTS` | Тема письма по типу и языку |
| Типы | `events/mail-events.constants.ts` → `EmailType` | Метка типа в джобе, для логов |

## Какие письма есть

| Тип | Метод | Куда ведёт ссылка | Кто шлёт |
|---|---|---|---|
| `verification` | `sendMemberEmailVerification`, `sendEmployeeEmailVerification` | `/{lang}/auth/confirm/{token}` в кабинете или CRM | регистрация участника, клуба, принятие приглашения новым аккаунтом, кнопка «выслать ещё раз» |
| `password-reset` | `sendPasswordReset` | `/{lang}/auth/reset-password?token=` | «Забыли пароль» в кабинете и CRM |
| `account-setup` | `sendAccountSetup` | `/{lang}/auth/reset-password?token=…&setup=1` | аккаунт без пароля, который завёл клуб: при создании участника из CRM и когда с этим email пробуют зарегистрироваться или принять приглашение (TASK-664) |
| `membership-consent` | `sendMembershipConsent` | `/{lang}/consent/{token}` в CRM | клуб добавил существующий аккаунт по email (TASK-663) |
| `employee-invitation` | `sendEmployeeInvitation` | `/{lang}/auth/invite/{token}` в CRM | приглашение сотрудника (TASK-662) |
| `portal-registration` | `sendPortalRegistrationEmail` | вход в CRM клуба | событие регистрации клуба; `jobId` фиксирован — одно письмо на клуб |

Адрес приложения берётся из env: `CRM_FRONTEND_URL` для сотрудников, `MEMBER_FRONTEND_URL` для участников.
Если `MEMBER_FRONTEND_URL` пуст (кабинет не поднят), `sendAccountSetup` письмо не шлёт и пишет warning:
ссылка в никуда хуже, чем без письма.

## Правила

- Письмо не должно ронять сценарий, в котором оно шлётся: аккаунт или членство уже созданы. Вызовы из
  сервисов обёрнуты в `try/catch` с логом, а токены пишутся в БД до отправки — повторная отправка
  по кнопке всегда возможна.
- Без `jobId` письмо может уйти повторно по кнопке «выслать ещё раз» — так и задумано. `jobId` ставится
  только там, где письмо должно уйти ровно один раз (`buildJobId`, без `:`).
- В лог — только адресат и тема: в html лежат ссылки с токенами.
- Новое письмо: тексты в `consts/<name>-email.ts` + геттер в `lib/utils/template.util.ts`, тема в
  `EMAIL_SUBJECTS`, тип в `EmailType`, шаблон на `EmailLayout`, метод в `MailService`.

## Отправитель и SMTP

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (только адрес), `SMTP_FROM_NAME`.
Дефолты `noreply@paf-paf.app` / `PafPaf` — для dev; на проде задаются в Dokploy
(`infra/dokploy/README.md` → «Почта», провайдер из ЕС).

## Тесты

Под jest рендер шаблонов падает («A dynamic import callback was invoked without
--experimental-vm-modules»), поэтому e2e не проверяют содержимое писем: они читают токен из БД
(`emailVerificationToken`, `resetPasswordToken`) и идут по сценарию дальше. Посмотреть письмо глазами:
`npx nest build`, затем `render(AccountSetupTemplate({...}))` из `dist/` в файл и открыть в браузере.
