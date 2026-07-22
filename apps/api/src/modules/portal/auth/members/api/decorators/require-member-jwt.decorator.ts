import { applyDecorators, UseGuards } from "@nestjs/common";

import { MembershipGuard } from "@common/portal";

import { MemberJwtAuthGuard } from "../../infrastructure/guards/member-jwt-auth.guard";
import { MemberJwtMobileAuthGuard } from "../../infrastructure/guards/member-jwt-mobile-auth.guard";

/** ЛК сайта: JWT из HttpOnly cookie + membership в портале запроса (req.user = Member). */
export const RequireMemberJwt = () =>
    applyDecorators(UseGuards(MemberJwtAuthGuard, MembershipGuard));

/** Нативное ЛК: JWT из Authorization Bearer + membership в портале запроса. */
export const RequireMemberJwtMobile = () =>
    applyDecorators(UseGuards(MemberJwtMobileAuthGuard, MembershipGuard));

/** Глобальные ЛК-эндпоинты (без портала): только JWT, req.user = AuthenticatedUser. */
export const RequireUserJwt = () => applyDecorators(UseGuards(MemberJwtAuthGuard));

/** Глобальные ЛК-эндпоинты (native): только JWT, req.user = AuthenticatedUser. */
export const RequireUserJwtMobile = () => applyDecorators(UseGuards(MemberJwtMobileAuthGuard));
