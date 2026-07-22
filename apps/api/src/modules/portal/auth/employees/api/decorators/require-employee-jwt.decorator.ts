import { applyDecorators, UseGuards } from "@nestjs/common";

import { PortalCrmSubscriptionGuard } from "@common/guards/portal-crm-subscription.guard";
import { MembershipGuard } from "@common/portal";

import { AdminGuard } from "../../infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "../../infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeJwtMobileAuthGuard } from "../../infrastructure/guards/employee-jwt-mobile-auth.guard";

/** CRM веб: JWT из HttpOnly cookie + employment в портале запроса (req.user = Employee). */
export const RequireEmployeeJwt = () =>
    applyDecorators(
        UseGuards(EmployeeJwtAuthGuard, MembershipGuard, PortalCrmSubscriptionGuard)
    );

/** Нативный CRM: JWT из Authorization Bearer + employment в портале запроса. */
export const RequireEmployeeJwtMobile = () =>
    applyDecorators(
        UseGuards(EmployeeJwtMobileAuthGuard, MembershipGuard, PortalCrmSubscriptionGuard)
    );

/** CRM: сотрудник + роль admin/portal_owner (после MembershipGuard). */
export const RequireEmployeeAdmin = () =>
    applyDecorators(
        UseGuards(EmployeeJwtAuthGuard, MembershipGuard, PortalCrmSubscriptionGuard, AdminGuard)
    );

/** Глобальные CRM-эндпоинты (без портала, напр. /crm/my-portals): только JWT, req.user = AuthenticatedUser. */
export const RequireEmployeeUserJwt = () => applyDecorators(UseGuards(EmployeeJwtAuthGuard));

/** Глобальные CRM-эндпоинты (native): только JWT, req.user = AuthenticatedUser. */
export const RequireEmployeeUserJwtMobile = () =>
    applyDecorators(UseGuards(EmployeeJwtMobileAuthGuard));
