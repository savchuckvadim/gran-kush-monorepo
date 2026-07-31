import { applyDecorators, UseGuards } from "@nestjs/common";

import { Admin } from "@common/decorators/auth/admin.decorator";
import { EmployeeRoles, MANAGER_ROLES } from "@common/decorators/auth/employee-roles.decorator";
import { PortalCrmSubscriptionGuard } from "@common/guards/portal-crm-subscription.guard";
import { MembershipGuard } from "@common/portal";

import { AdminGuard } from "../../infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "../../infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeJwtMobileAuthGuard } from "../../infrastructure/guards/employee-jwt-mobile-auth.guard";
import { EmployeeRolesGuard } from "../../infrastructure/guards/employee-roles.guard";

/** CRM веб: JWT из HttpOnly cookie + employment в портале запроса (req.user = Employee). */
export const RequireEmployeeJwt = () =>
    applyDecorators(UseGuards(EmployeeJwtAuthGuard, MembershipGuard, PortalCrmSubscriptionGuard));

/** CRM веб без subscription gate: для endpoints, которые должны отвечать и при 402 (напр. /crm/portal/info). */
export const RequireEmployeeJwtWithoutSubscriptionGate = () =>
    applyDecorators(UseGuards(EmployeeJwtAuthGuard, MembershipGuard));

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

/**
 * Handler-level: роль manager/admin/portal_owner. Контроллер уже должен быть под
 * @RequireEmployeeJwt() — здесь навешивается только проверка роли.
 */
export const RequireManager = () =>
    applyDecorators(UseGuards(EmployeeRolesGuard), EmployeeRoles(...MANAGER_ROLES));

/**
 * Handler-level: роль admin/portal_owner. Контроллер уже должен быть под
 * @RequireEmployeeJwt() — здесь навешивается только проверка роли.
 */
export const RequireAdmin = () => applyDecorators(UseGuards(AdminGuard), Admin());

/** Глобальные CRM-эндпоинты (без портала, напр. /crm/my-portals): только JWT, req.user = AuthenticatedUser. */
export const RequireEmployeeUserJwt = () => applyDecorators(UseGuards(EmployeeJwtAuthGuard));

/** Глобальные CRM-эндпоинты (native): только JWT, req.user = AuthenticatedUser. */
export const RequireEmployeeUserJwtMobile = () =>
    applyDecorators(UseGuards(EmployeeJwtMobileAuthGuard));
