import { applyDecorators, UseGuards } from "@nestjs/common";

import { PortalTenantMatchGuard } from "@common/portal";

import { AdminGuard } from "../../infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "../../infrastructure/guards/employee-jwt-auth.guard";
import { EmployeeJwtMobileAuthGuard } from "../../infrastructure/guards/employee-jwt-mobile-auth.guard";

/** CRM веб: JWT из HttpOnly cookie. */
export const RequireEmployeeJwt = () =>
    applyDecorators(UseGuards(EmployeeJwtAuthGuard, PortalTenantMatchGuard));

/** Нативный CRM: JWT из Authorization Bearer. */
export const RequireEmployeeJwtMobile = () =>
    applyDecorators(UseGuards(EmployeeJwtMobileAuthGuard, PortalTenantMatchGuard));

/** CRM: сотрудник + роль admin (после JWT). */
export const RequireEmployeeAdmin = () =>
    applyDecorators(UseGuards(EmployeeJwtAuthGuard, PortalTenantMatchGuard, AdminGuard));
