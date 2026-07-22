import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { RequireEmployeeUserJwt } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { MyPortalsResponseDto } from "../dto/lk-portals.dto";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

@ApiTags("CRM My Portals")
@Controller("crm/my-portals")
export class CrmMyPortalsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @RequireEmployeeUserJwt()
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
}
