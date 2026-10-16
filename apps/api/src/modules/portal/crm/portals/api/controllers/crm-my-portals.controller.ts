import { Body, Controller, Get, Headers, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { SIGNUP_THROTTLE } from "@common/config/throttler/throttler.config";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { RequireEmployeeUserJwt } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

import { PortalRegistrationService } from "../../application/services/portal-registration.service";
import { MyPortalsResponseDto } from "../dto/cabinet-portals.dto";
import { CreateClubDto } from "../dto/create-club.dto";
import { RegisterPortalResponseDto } from "../dto/register-portal-response.dto";

/** Клубы аккаунта в CRM: список для переключателя и новый клуб для того же аккаунта. */
@ApiTags("CRM My Portals")
@Controller("crm/my-portals")
@RequireEmployeeUserJwt()
export class CrmMyPortalsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly registration: PortalRegistrationService,
        private readonly cookieService: AuthCookieService
    ) {}

    @Get()
    @ApiOperation({ summary: "Порталы, где текущий аккаунт — сотрудник (для переключателя)" })
    @ApiSuccessResponse(MyPortalsResponseDto)
    @ApiErrorResponse([401])
    async myPortals(@CurrentAuthUser() user: AuthenticatedUser): Promise<MyPortalsResponseDto> {
        const employees = await this.prisma.employee.findMany({
            where: { userId: user.userId, isActive: true },
            include: { portal: { select: PORTAL_SUMMARY_SELECT } },
            orderBy: { createdAt: "asc" },
        });
        return {
            portals: employees.map((e) => ({
                portalId: e.portalId,
                slug: e.portal.name,
                displayName: e.portal.displayName,
                employeeId: e.id,
                role: e.role,
                isActive: e.isActive,
            })),
        };
    }

    @Post()
    @Throttle(SIGNUP_THROTTLE)
    @ApiOperation({
        summary:
            "Новый клуб для аккаунта сессии: аккаунт — его владелец, сессия CRM выдаётся заново HttpOnly-куками",
    })
    @ApiSuccessResponse(RegisterPortalResponseDto, { status: 201 })
    @ApiErrorResponse([400, 401, 409])
    async createClub(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: CreateClubDto,
        @Headers() headers: Record<string, string | string[] | undefined>,
        @Res({ passthrough: true }) response: Response
    ): Promise<RegisterPortalResponseDto> {
        const deviceId = resolveDeviceIdFromHeaders(headers);
        const result = await this.registration.createClubForAccount(user, dto, deviceId);
        this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.CRM, result.tokens);
        return {
            portal: result.portal,
            owner: {
                id: result.owner.id,
                email: result.owner.email,
                name: result.owner.name,
                role: result.owner.role,
            },
            deviceId,
        };
    }
}
