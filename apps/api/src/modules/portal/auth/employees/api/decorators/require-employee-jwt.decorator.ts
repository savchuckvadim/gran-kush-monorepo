import { applyDecorators, UseGuards } from "@nestjs/common";

import { PortalCrmSubscriptionGuard } from "@common/guards/portal-crm-subscription.guard";
import { MembershipGuard } from "@common/portal";
import { PermissionGuard } from "@common/portal/permission.guard";

import { EmployeeJwtAuthGuard } from "../../infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeJwtMobileAuthGuard } from "../../infrastructure/guards/employee-jwt-mobile-auth.guard";

/**
 * CRM веб: JWT из HttpOnly cookie + сотрудник клуба из запроса + его права (`@RequirePermission`)
 * + активная подписка клуба (402).
 */
export const RequireEmployeeJwt = () =>
    applyDecorators(
        UseGuards(
            EmployeeJwtAuthGuard,
            MembershipGuard,
            PermissionGuard,
            PortalCrmSubscriptionGuard
        )
    );

/** CRM веб без subscription gate: для endpoints, которые должны отвечать и при 402 (напр. /crm/portal/info). */
export const RequireEmployeeJwtWithoutSubscriptionGate = () =>
    applyDecorators(UseGuards(EmployeeJwtAuthGuard, MembershipGuard, PermissionGuard));

/** Глобальные CRM-эндпоинты (без портала, напр. /crm/my-portals): только JWT, req.user = AuthenticatedUser. */
export const RequireEmployeeUserJwt = () => applyDecorators(UseGuards(EmployeeJwtAuthGuard));

/** Глобальные CRM-эндпоинты (native): только JWT, req.user = AuthenticatedUser. */
export const RequireEmployeeUserJwtMobile = () =>
    applyDecorators(UseGuards(EmployeeJwtMobileAuthGuard));
