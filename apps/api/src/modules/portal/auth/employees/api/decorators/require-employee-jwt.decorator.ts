import { applyDecorators, UseGuards } from "@nestjs/common";

import { PortalCrmSubscriptionGuard } from "@common/guards/portal-crm-subscription.guard";
import { PortalTenantMatchGuard } from "@common/portal";

import { AdminGuard } from "../../infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "../../infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeJwtMobileAuthGuard } from "../../infrastructure/guards/employee-jwt-mobile-auth.guard";

/** CRM веб: JWT из HttpOnly cookie. */
export const RequireEmployeeJwt = () =>
    applyDecorators(
        UseGuards(EmployeeJwtAuthGuard, PortalTenantMatchGuard, PortalCrmSubscriptionGuard)
    );

/** Нативный CRM: JWT из Authorization Bearer. */
export const RequireEmployeeJwtMobile = () =>
    applyDecorators(
        UseGuards(EmployeeJwtMobileAuthGuard, PortalTenantMatchGuard, PortalCrmSubscriptionGuard)
    );

/** CRM: сотрудник + роль admin (после JWT). */
export const RequireEmployeeAdmin = () =>
    applyDecorators(
        UseGuards(
            EmployeeJwtAuthGuard,
            PortalTenantMatchGuard,
            PortalCrmSubscriptionGuard,
            AdminGuard
        )
    );
