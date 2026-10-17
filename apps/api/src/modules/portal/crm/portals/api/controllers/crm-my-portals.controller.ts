import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { SIGNUP_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { CrmSession } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

import { PortalRegistrationService } from "../../application/services/portal-registration.service";
import { MyPortalsResponseDto } from "../dto/cabinet-portals.dto";
import { CreateClubDto } from "../dto/create-club.dto";
import { CreatedClubResponseDto } from "../dto/register-portal-response.dto";

/** Клубы аккаунта в CRM: список для переключателя и новый клуб для того же аккаунта. */
@ApiTags("CRM My Portals")
@Controller("crm/my-portals")
@CrmSession()
export class CrmMyPortalsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly registration: PortalRegistrationService
    ) {}

    @Get()
    @ApiOperation({ summary: "Порталы, где текущий аккаунт — сотрудник (для переключателя)" })
    @ApiSuccessResponse(MyPortalsResponseDto)
    @ApiErrorResponse([401])
    async myPortals(@CurrentAuthUser() user: AuthenticatedUser): Promise<MyPortalsResponseDto> {
        const employees = await this.prisma.employee.findMany({
            where: { userId: user.userId, isActive: true },
            include: { portal: { select: PORTAL_SUMMARY_SELECT }, role: { select: { key: true } } },
            orderBy: { createdAt: "asc" },
        });
        return {
            portals: employees.map((e) => ({
                portalId: e.portalId,
                slug: e.portal.name,
                displayName: e.portal.displayName,
                employeeId: e.id,
                role: e.role.key,
                isActive: e.isActive,
            })),
        };
    }

    @Post()
    @Throttle(SIGNUP_THROTTLE)
    @ApiOperation({
        summary:
            "Новый клуб для аккаунта сессии: аккаунт — его владелец; сессия CRM та же (она на аккаунт, не на клуб)",
    })
    @ApiSuccessResponse(CreatedClubResponseDto, { status: 201 })
    @ApiErrorResponse([400, 401, 409])
    async createClub(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: CreateClubDto
    ): Promise<CreatedClubResponseDto> {
        const result = await this.registration.createClubForAccount(user, dto);
        return {
            portal: result.portal,
            owner: {
                id: result.owner.id,
                email: result.owner.email,
                name: result.owner.name,
                role: result.owner.role,
            },
        };
    }
}
