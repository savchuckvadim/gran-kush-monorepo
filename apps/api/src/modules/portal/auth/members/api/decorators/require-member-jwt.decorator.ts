import { applyDecorators, UseGuards } from "@nestjs/common";

import { PortalTenantMatchGuard } from "@common/portal";

import { MemberJwtAuthGuard } from "../../infrastructure/guards/member-jwt-auth.guard";
import { MemberJwtMobileAuthGuard } from "../../infrastructure/guards/member-jwt-mobile-auth.guard";

/** ЛК сайта: JWT из HttpOnly cookie. */
export const RequireMemberJwt = () =>
    applyDecorators(UseGuards(MemberJwtAuthGuard, PortalTenantMatchGuard));

/** Нативное ЛК: JWT из Authorization Bearer. */
export const RequireMemberJwtMobile = () =>
    applyDecorators(UseGuards(MemberJwtMobileAuthGuard, PortalTenantMatchGuard));
