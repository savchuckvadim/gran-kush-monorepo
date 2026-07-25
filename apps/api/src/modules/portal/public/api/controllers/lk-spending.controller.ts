import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Prisma } from "@prisma/client";

import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

import { MySpendingResponseDto, SpendingByPortalDto } from "../dto/public-portals.dto";

/** Кросс-клубные траты member: агрегация заказов по всем его membership-мостам. */
@ApiTags("LK Spending")
@Controller("lk/spending")
export class LkSpendingController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @RequireUserJwt()
    @ApiOperation({ summary: "Мои траты по всем клубам" })
    @ApiSuccessResponse(MySpendingResponseDto)
    @ApiErrorResponse([401])
    async mySpending(@CurrentAuthUser() user: AuthenticatedUser): Promise<MySpendingResponseDto> {
        const members = await this.prisma.member.findMany({
            where: { userId: user.userId },
            include: { portal: { select: PORTAL_SUMMARY_SELECT } },
        });

        const grouped = members.length
            ? await this.prisma.order.groupBy({
                  by: ["memberId"],
                  where: { memberId: { in: members.map((m) => m.id) } },
                  _sum: { total: true },
                  _count: { _all: true },
              })
            : [];
        const aggByMemberId = new Map(grouped.map((g) => [g.memberId, g]));

        const byPortal: SpendingByPortalDto[] = [];
        let grandTotal = new Prisma.Decimal(0);
        let totalOrders = 0;

        for (const member of members) {
            const agg = aggByMemberId.get(member.id);
            const totalSpent = agg?._sum.total ?? new Prisma.Decimal(0);
            const ordersCount = agg?._count._all ?? 0;
            grandTotal = grandTotal.add(totalSpent);
            totalOrders += ordersCount;
            byPortal.push({
                portalId: member.portalId,
                slug: member.portal.name,
                displayName: member.portal.displayName,
                ordersCount,
                totalSpent: totalSpent.toFixed(2),
            });
        }

        return {
            byPortal,
            totalSpent: grandTotal.toFixed(2),
            totalOrders,
        };
    }
}
