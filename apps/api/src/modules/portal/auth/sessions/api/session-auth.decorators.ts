import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";

import { PortalCrmSubscriptionGuard } from "@common/guards/portal-crm-subscription.guard";
import { MembershipGuard } from "@common/portal/membership.guard";
import { PermissionGuard } from "@common/portal/permission.guard";
import { PortalModuleGuard, RequirePortalModule } from "@common/portal/portal-module.guard";
import type { PortalModuleCode } from "@modules/portal/crm/portal-modules/domain/portal-module.catalog";

import { CabinetSessionGuard, CrmSessionGuard } from "./session.guard";
import { SESSION_COOKIE_NAMES } from "./session-cookies.service";

/**
 * Декораторы доступа (AUTH_ARCHITECTURE §4). Гварды идут одной цепочкой в одном `UseGuards`:
 * сессия → членство в клубе из `X-Portal-*` → права → подписка клуба.
 */

/** Вошёл в CRM; клуб не нужен (`/crm/my-portals`, «Вход и безопасность»). */
export const CrmSession = () =>
    applyDecorators(
        UseGuards(CrmSessionGuard),
        ApiCookieAuth(SESSION_COOKIE_NAMES.crm.access),
        ApiBearerAuth()
    );

/**
 * Сотрудник клуба из запроса и его права (`@RequirePermission`); `subscription: false` — маршрут
 * отвечает и клубу с истёкшей подпиской (биллинг, сведения о клубе); `module` — маршрут подключаемого
 * модуля (TASK-796): при выключенном модуле — 403 `module_disabled`, после проверки прав.
 */
export const CrmAuth = (options: { subscription?: boolean; module?: PortalModuleCode } = {}) =>
    applyDecorators(
        UseGuards(
            CrmSessionGuard,
            MembershipGuard,
            PermissionGuard,
            ...(options.subscription === false ? [] : [PortalCrmSubscriptionGuard]),
            ...(options.module ? [PortalModuleGuard] : [])
        ),
        ...(options.module ? [RequirePortalModule(options.module)] : []),
        ApiCookieAuth(SESSION_COOKIE_NAMES.crm.access),
        ApiBearerAuth()
    );

/** Вошёл в кабинет; клуб не нужен (мои клубы, паспорт, аккаунт). */
export const CabinetSession = () =>
    applyDecorators(
        UseGuards(CabinetSessionGuard),
        ApiCookieAuth(SESSION_COOKIE_NAMES.cabinet.access),
        ApiBearerAuth()
    );

/** Подтверждённое членство в клубе из запроса. */
export const CabinetAuth = () =>
    applyDecorators(
        UseGuards(CabinetSessionGuard, MembershipGuard),
        ApiCookieAuth(SESSION_COOKIE_NAMES.cabinet.access),
        ApiBearerAuth()
    );
