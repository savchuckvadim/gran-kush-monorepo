# Маршруты API и их защита

Сгенерировано тестом `test/route-auth.e2e-spec.ts` (`WRITE_AUTH_MATRIX=1`). Не править руками:
тест падает, если маршрут не объявлен `@Public()` и не стоит под гвардом сессии, или если
`@RequirePermission` стоит без `PermissionGuard`.

Всего маршрутов: 242, публичных: 57.

| Метод | Путь | Доступ | Права |
|---|---|---|---|
| GET | `/` | публичный |  |
| POST | `/auth/password/reset` | публичный |  |
| POST | `/auth/password/reset/request` | публичный |  |
| POST | `/auth/verify` | публичный |  |
| GET | `/auth/verify/:token` | публичный |  |
| GET | `/cabinet/account/documents` | CabinetSession |  |
| POST | `/cabinet/account/documents` | CabinetSession |  |
| DELETE | `/cabinet/account/documents/:id` | CabinetSession |  |
| GET | `/cabinet/account/documents/:id/preview` | CabinetSession |  |
| POST | `/cabinet/account/documents/:id/share` | CabinetSession |  |
| DELETE | `/cabinet/account/documents/:id/share/:memberId` | CabinetSession |  |
| GET | `/cabinet/account/profile` | CabinetSession |  |
| PUT | `/cabinet/account/profile` | CabinetSession |  |
| GET | `/cabinet/account/security` | CabinetSession |  |
| DELETE | `/cabinet/account/security/:provider` | CabinetSession |  |
| POST | `/cabinet/account/security/:provider` | CabinetSession |  |
| PUT | `/cabinet/account/security/password` | CabinetSession |  |
| POST | `/cabinet/account/security/sign-out-everywhere` | CabinetSession |  |
| GET | `/cabinet/account/sessions` | CabinetSession |  |
| DELETE | `/cabinet/account/sessions/:id` | CabinetSession |  |
| POST | `/cabinet/account/sessions/sign-out-others` | CabinetSession |  |
| DELETE | `/cabinet/account/signature` | CabinetSession |  |
| GET | `/cabinet/account/signature` | CabinetSession |  |
| PUT | `/cabinet/account/signature` | CabinetSession |  |
| GET | `/cabinet/account/signature/preview` | CabinetSession |  |
| POST | `/cabinet/account/signature/share` | CabinetSession |  |
| DELETE | `/cabinet/account/signature/share/:memberId` | CabinetSession |  |
| GET | `/cabinet/auth/:provider/callback` | публичный |  |
| GET | `/cabinet/auth/:provider/link` | CabinetSession |  |
| GET | `/cabinet/auth/:provider/start` | публичный |  |
| POST | `/cabinet/auth/:provider/verify` | публичный |  |
| POST | `/cabinet/auth/identity/confirm` | публичный |  |
| POST | `/cabinet/auth/identity/email` | публичный |  |
| POST | `/cabinet/auth/login` | публичный |  |
| POST | `/cabinet/auth/logout` | публичный |  |
| GET | `/cabinet/auth/me` | CabinetSession |  |
| POST | `/cabinet/auth/member/confirm-email` | публичный |  |
| POST | `/cabinet/auth/member/confirm-email/resend` | публичный |  |
| POST | `/cabinet/auth/member/files` | CabinetSession |  |
| POST | `/cabinet/auth/member/register` | публичный |  |
| GET | `/cabinet/auth/member/registration-schema` | публичный |  |
| POST | `/cabinet/auth/password/reset` | публичный |  |
| POST | `/cabinet/auth/password/reset/confirm` | публичный |  |
| GET | `/cabinet/auth/providers` | публичный |  |
| POST | `/cabinet/auth/refresh` | публичный |  |
| GET | `/cabinet/catalog/categories` | CabinetSession → Membership → ShopAccess |  |
| GET | `/cabinet/catalog/products` | CabinetSession → Membership → ShopAccess |  |
| GET | `/cabinet/catalog/products/:id` | CabinetSession → Membership → ShopAccess |  |
| GET | `/cabinet/club/monthly-limit` | CabinetSession → Membership |  |
| GET | `/cabinet/club/shop-access` | CabinetSession → Membership |  |
| POST | `/cabinet/invitations/:token/accept` | CabinetSession |  |
| GET | `/cabinet/members/me` | CabinetSession → Membership |  |
| GET | `/cabinet/memberships` | CabinetSession |  |
| POST | `/cabinet/memberships/:id/confirm` | CabinetSession |  |
| POST | `/cabinet/memberships/:id/decline` | CabinetSession |  |
| POST | `/cabinet/memberships/:id/leave` | CabinetSession |  |
| POST | `/cabinet/mobile/auth/login` | публичный |  |
| POST | `/cabinet/mobile/auth/logout` | публичный |  |
| GET | `/cabinet/mobile/auth/me` | CabinetSession |  |
| POST | `/cabinet/mobile/auth/refresh` | публичный |  |
| GET | `/cabinet/orders` | CabinetSession → Membership |  |
| POST | `/cabinet/orders` | CabinetSession → Membership → ShopAccess |  |
| GET | `/cabinet/orders/:id` | CabinetSession → Membership |  |
| PATCH | `/cabinet/orders/:id/cancel` | CabinetSession → Membership |  |
| GET | `/cabinet/portals` | CabinetSession |  |
| POST | `/cabinet/portals/:slug/join` | CabinetSession |  |
| GET | `/cabinet/presence/history` | CabinetSession → Membership |  |
| GET | `/cabinet/presence/status` | CabinetSession → Membership |  |
| GET | `/cabinet/qr-code` | CabinetSession → Membership |  |
| POST | `/cabinet/qr-code/regenerate` | CabinetSession → Membership |  |
| POST | `/cabinet/reg-links/:token/join` | CabinetSession |  |
| GET | `/cabinet/reviews/portals/:portalId` | CabinetSession |  |
| PUT | `/cabinet/reviews/portals/:portalId` | CabinetSession |  |
| PUT | `/cabinet/reviews/products/:productId` | CabinetSession |  |
| GET | `/cabinet/spending` | CabinetSession |  |
| GET | `/crm/account/security` | CrmSession |  |
| DELETE | `/crm/account/security/:provider` | CrmSession |  |
| POST | `/crm/account/security/:provider` | CrmSession |  |
| PUT | `/crm/account/security/password` | CrmSession |  |
| POST | `/crm/account/security/sign-out-everywhere` | CrmSession |  |
| GET | `/crm/account/sessions` | CrmSession |  |
| DELETE | `/crm/account/sessions/:id` | CrmSession |  |
| POST | `/crm/account/sessions/sign-out-others` | CrmSession |  |
| GET | `/crm/auth/:provider/callback` | публичный |  |
| GET | `/crm/auth/:provider/link` | CrmSession |  |
| GET | `/crm/auth/:provider/start` | публичный |  |
| POST | `/crm/auth/:provider/verify` | публичный |  |
| POST | `/crm/auth/confirm-email` | публичный |  |
| POST | `/crm/auth/confirm-email/resend` | CrmSession |  |
| POST | `/crm/auth/confirm-email/resend-public` | публичный |  |
| POST | `/crm/auth/identity/confirm` | публичный |  |
| POST | `/crm/auth/identity/email` | публичный |  |
| POST | `/crm/auth/invitations/:token/accept` | CrmSession |  |
| POST | `/crm/auth/login` | публичный |  |
| POST | `/crm/auth/logout` | публичный |  |
| GET | `/crm/auth/me` | CrmSession |  |
| POST | `/crm/auth/password/reset` | публичный |  |
| POST | `/crm/auth/password/reset/confirm` | публичный |  |
| GET | `/crm/auth/providers` | публичный |  |
| POST | `/crm/auth/refresh` | публичный |  |
| GET | `/crm/billing` | CrmSession → Membership → Permission | `billing.manage` |
| POST | `/crm/billing/checkout` | CrmSession → Membership → Permission | `billing.manage` |
| POST | `/crm/billing/manage` | CrmSession → Membership → Permission | `billing.manage` |
| GET | `/crm/catalog/categories` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| POST | `/crm/catalog/categories` | CrmSession → Membership → Permission → PortalCrmSubscription | `catalog.manage` |
| DELETE | `/crm/catalog/categories/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `catalog.manage` |
| PATCH | `/crm/catalog/categories/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `catalog.manage` |
| GET | `/crm/catalog/categories/tree` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| GET | `/crm/catalog/measurement-units` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| POST | `/crm/catalog/measurement-units` | CrmSession → Membership → Permission → PortalCrmSubscription | `catalog.manage` |
| DELETE | `/crm/catalog/measurement-units/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `catalog.manage` |
| PATCH | `/crm/catalog/measurement-units/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `catalog.manage` |
| GET | `/crm/catalog/products` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| POST | `/crm/catalog/products` | CrmSession → Membership → Permission → PortalCrmSubscription | `catalog.manage` |
| DELETE | `/crm/catalog/products/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `catalog.manage` |
| GET | `/crm/catalog/products/:id` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| PATCH | `/crm/catalog/products/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `catalog.manage` |
| GET | `/crm/employees` | CrmSession → Membership → Permission → PortalCrmSubscription | `employees.read` |
| POST | `/crm/employees` | CrmSession → Membership → Permission → PortalCrmSubscription | `employees.read`, `employees.manage` |
| DELETE | `/crm/employees/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `employees.read`, `employees.manage` |
| GET | `/crm/employees/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `employees.read` |
| PATCH | `/crm/employees/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `employees.read`, `employees.manage` |
| GET | `/crm/employees/form-schema` | CrmSession → Membership → Permission → PortalCrmSubscription | `employees.read` |
| GET | `/crm/entities` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| POST | `/crm/entities` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| GET | `/crm/entities/:code/records` | CrmSession → Membership → Permission → PortalCrmSubscription | `records.read` |
| POST | `/crm/entities/:code/records` | CrmSession → Membership → Permission → PortalCrmSubscription | `records.read`, `records.write` |
| DELETE | `/crm/entities/:code/records/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `records.read`, `records.delete` |
| GET | `/crm/entities/:code/records/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `records.read` |
| PATCH | `/crm/entities/:code/records/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `records.read`, `records.write` |
| PATCH | `/crm/entities/:code/records/:id/stage` | CrmSession → Membership → Permission → PortalCrmSubscription | `records.read`, `records.write` |
| PATCH | `/crm/entities/:code/records/:id/status` | CrmSession → Membership → Permission → PortalCrmSubscription | `records.read`, `records.write` |
| GET | `/crm/finance/reports/by-date` | CrmSession → Membership → Permission → PortalCrmSubscription | `finance.read` |
| GET | `/crm/finance/reports/by-type` | CrmSession → Membership → Permission → PortalCrmSubscription | `finance.read` |
| GET | `/crm/finance/reports/summary` | CrmSession → Membership → Permission → PortalCrmSubscription | `finance.read` |
| GET | `/crm/finance/transactions` | CrmSession → Membership → Permission → PortalCrmSubscription | `finance.read` |
| POST | `/crm/finance/transactions` | CrmSession → Membership → Permission → PortalCrmSubscription | `finance.read`, `finance.write` |
| GET | `/crm/finance/transactions/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `finance.read` |
| GET | `/crm/members` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read` |
| POST | `/crm/members` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read`, `members.create` |
| GET | `/crm/members/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read` |
| PATCH | `/crm/members/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read`, `members.edit` |
| POST | `/crm/members/:id/consent/resend` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read`, `members.create` |
| GET | `/crm/members/:id/documents/:documentId/preview` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read`, `members.documents` |
| PATCH | `/crm/members/:id/files` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read`, `members.edit` |
| GET | `/crm/members/:id/signature/preview` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read`, `members.documents` |
| PATCH | `/crm/members/:id/status` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read`, `members.edit` |
| GET | `/crm/members/:memberId/monthly-limit` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read` |
| PATCH | `/crm/members/:memberId/monthly-limit` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read`, `members.edit` |
| GET | `/crm/members/form-schema` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read` |
| POST | `/crm/mobile/auth/login` | публичный |  |
| POST | `/crm/mobile/auth/logout` | публичный |  |
| GET | `/crm/mobile/auth/me` | CrmSession |  |
| POST | `/crm/mobile/auth/refresh` | публичный |  |
| GET | `/crm/my-portals` | CrmSession |  |
| POST | `/crm/my-portals` | CrmSession |  |
| GET | `/crm/orders` | CrmSession → Membership → Permission → PortalCrmSubscription | `orders.read` |
| POST | `/crm/orders` | CrmSession → Membership → Permission → PortalCrmSubscription | `orders.read`, `orders.create` |
| GET | `/crm/orders/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `orders.read` |
| PATCH | `/crm/orders/:id/payment` | CrmSession → Membership → Permission → PortalCrmSubscription | `orders.read`, `orders.process` |
| PATCH | `/crm/orders/:id/stage` | CrmSession → Membership → Permission → PortalCrmSubscription | `orders.read`, `orders.process` |
| PATCH | `/crm/orders/:id/status` | CrmSession → Membership → Permission → PortalCrmSubscription | `orders.read`, `orders.process` |
| GET | `/crm/orders/stages/summary` | CrmSession → Membership → Permission → PortalCrmSubscription | `orders.read` |
| PATCH | `/crm/portal/appearance` | CrmSession → Membership → Permission | `settings.club` |
| GET | `/crm/portal/info` | CrmSession → Membership → Permission |  |
| GET | `/crm/portals/resolve` | публичный |  |
| GET | `/crm/presence/currently-present` | CrmSession → Membership → Permission → PortalCrmSubscription | `presence.read` |
| POST | `/crm/presence/manual/check-in` | CrmSession → Membership → Permission → PortalCrmSubscription | `presence.checkin` |
| POST | `/crm/presence/manual/check-out` | CrmSession → Membership → Permission → PortalCrmSubscription | `presence.checkin` |
| POST | `/crm/presence/qr-preview` | CrmSession → Membership → Permission → PortalCrmSubscription | `presence.checkin` |
| POST | `/crm/presence/qr-scan` | CrmSession → Membership → Permission → PortalCrmSubscription | `presence.checkin` |
| GET | `/crm/presence/sessions` | CrmSession → Membership → Permission → PortalCrmSubscription | `presence.read` |
| GET | `/crm/presence/sessions/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `presence.read` |
| GET | `/crm/presence/stats` | CrmSession → Membership → Permission → PortalCrmSubscription | `presence.read` |
| POST | `/crm/qr-codes/generate` | CrmSession → Membership → Permission → PortalCrmSubscription | `qr.manage` |
| DELETE | `/crm/qr-codes/member/:memberId` | CrmSession → Membership → Permission → PortalCrmSubscription | `qr.manage` |
| GET | `/crm/qr-codes/member/:memberId` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.read` |
| POST | `/crm/qr-codes/scan` | CrmSession → Membership → Permission → PortalCrmSubscription | `presence.checkin` |
| GET | `/crm/search` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| GET | `/crm/settings/club-policy` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| PATCH | `/crm/settings/club-policy` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.club` |
| GET | `/crm/settings/entities/:code/fields` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| POST | `/crm/settings/entities/:code/fields` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| DELETE | `/crm/settings/entities/:code/fields/:fieldKey` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| PATCH | `/crm/settings/entities/:code/fields/:fieldKey` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| POST | `/crm/settings/entities/:code/fields/:fieldKey/options` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| GET | `/crm/settings/entities/:code/filter-fields` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| GET | `/crm/settings/entities/:code/form-schema/:purpose` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| PATCH | `/crm/settings/entities/:code/forms/:purpose` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| GET | `/crm/settings/entities/:code/stage-categories` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| POST | `/crm/settings/entities/:code/stage-categories` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| DELETE | `/crm/settings/entities/:code/stage-categories/:categoryId` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| PATCH | `/crm/settings/entities/:code/stage-categories/:categoryId` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| GET | `/crm/settings/entities/:code/status-sets` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| POST | `/crm/settings/entities/:code/status-sets` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| POST | `/crm/settings/entities/:code/status-sets/:setId/items` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| DELETE | `/crm/settings/entities/:code/status-sets/:setId/items/:itemId` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| PATCH | `/crm/settings/entities/:code/status-sets/:setId/items/:itemId` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.structure` |
| GET | `/crm/settings/entities/member/status-items` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| GET | `/crm/settings/invitations` | CrmSession → Membership → Permission → PortalCrmSubscription | `employees.manage` |
| POST | `/crm/settings/invitations` | CrmSession → Membership → Permission → PortalCrmSubscription | `employees.manage` |
| DELETE | `/crm/settings/invitations/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `employees.manage` |
| GET | `/crm/settings/portal` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.club` |
| PATCH | `/crm/settings/portal` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.club` |
| GET | `/crm/settings/presence` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| PATCH | `/crm/settings/presence` | CrmSession → Membership → Permission → PortalCrmSubscription | `settings.club` |
| GET | `/crm/settings/registration-links` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.invite` |
| POST | `/crm/settings/registration-links` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.invite` |
| PATCH | `/crm/settings/registration-links/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.invite` |
| POST | `/crm/settings/registration-links/:id/revoke` | CrmSession → Membership → Permission → PortalCrmSubscription | `members.invite` |
| GET | `/crm/settings/roles` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| POST | `/crm/settings/roles` | CrmSession → Membership → Permission → PortalCrmSubscription | `roles.manage` |
| DELETE | `/crm/settings/roles/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `roles.manage` |
| PATCH | `/crm/settings/roles/:id` | CrmSession → Membership → Permission → PortalCrmSubscription | `roles.manage` |
| GET | `/crm/settings/ui/:key` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| PUT | `/crm/settings/ui/:key` | CrmSession → Membership → Permission → PortalCrmSubscription |  |
| GET | `/health` | публичный |  |
| GET | `/platform/admin/billing/plans` | PlatformJwtAuth |  |
| POST | `/platform/admin/billing/plans` | PlatformJwtAuth |  |
| PATCH | `/platform/admin/billing/plans/:code` | PlatformJwtAuth |  |
| GET | `/platform/admin/billing/subscriptions` | PlatformJwtAuth |  |
| POST | `/platform/admin/billing/subscriptions/:portalId/manual-payments` | PlatformJwtAuth |  |
| PATCH | `/platform/admin/billing/subscriptions/:portalId/trial` | PlatformJwtAuth |  |
| POST | `/platform/auth/login` | публичный |  |
| GET | `/platform/billing/plans` | публичный |  |
| POST | `/platform/billing/webhooks/:provider` | публичный |  |
| GET | `/platform/portals` | PlatformJwtAuth |  |
| GET | `/platform/portals/:portalId` | PlatformJwtAuth |  |
| POST | `/platform/portals/register` | публичный |  |
| POST | `/platform/system/reference-data` | PlatformJwtAuth |  |
| GET | `/public/consent/:token` | публичный |  |
| POST | `/public/consent/:token/confirm` | публичный |  |
| POST | `/public/consent/:token/decline` | публичный |  |
| GET | `/public/invitations/:token` | публичный |  |
| POST | `/public/invitations/:token/accept` | публичный |  |
| GET | `/public/portals/:slug` | публичный |  |
| GET | `/public/portals/map` | публичный |  |
| GET | `/public/reg-links/:token` | публичный |  |
| POST | `/public/reg-links/:token/leave` | публичный |  |
| POST | `/public/reg-links/:token/ping` | публичный |  |
| POST | `/public/reg-links/:token/register` | публичный |  |
| GET | `/ready` | публичный |  |
