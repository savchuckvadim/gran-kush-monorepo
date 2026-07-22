import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Prisma } from "@prisma/client";

import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

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
            include: { portal: { select: { id: true, name: true, displayName: true } } },
        });

        const byPortal: SpendingByPortalDto[] = [];
        let grandTotal = new Prisma.Decimal(0);
        let totalOrders = 0;

        for (const member of members) {
            const agg = await this.prisma.order.aggregate({
                where: { memberId: member.id },
                _sum: { total: true },
                _count: { _all: true },
            });
            const totalSpent = agg._sum.total ?? new Prisma.Decimal(0);
            grandTotal = grandTotal.add(totalSpent);
            totalOrders += agg._count._all;
            byPortal.push({
                portalId: member.portalId,
                slug: member.portal.name,
                displayName: member.portal.displayName,
                ordersCount: agg._count._all,
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
