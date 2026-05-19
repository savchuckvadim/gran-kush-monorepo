import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PrismaService } from "@common/prisma/prisma.service";
import { PlatformJwtAuthGuard } from "@modules/platform/auth/infrastructure/guards/platform-jwt-auth.guard";

@ApiTags("Platform — порталы")
@Controller("platform/portals")
@UseGuards(PlatformJwtAuthGuard)
@ApiBearerAuth()
export class PlatformPortalsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @ApiOperation({ summary: "Список порталов и подписок" })
    async list() {
        return this.prisma.portal.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                subscription: { include: { plan: true } },
            },
        });
    }

    @Get(":portalId")
    @ApiOperation({ summary: "Портал по id" })
    async getOne(@Param("portalId") portalId: string) {
        return this.prisma.portal.findUnique({
            where: { id: portalId },
            include: {
                subscription: { include: { plan: true } },
            },
        });
    }
}
