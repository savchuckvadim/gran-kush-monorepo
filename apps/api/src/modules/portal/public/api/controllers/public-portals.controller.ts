import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalStatus } from "@prisma/client";

import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { PortalResolutionService } from "@modules/portal/crm/portals/application/services/portal-resolution.service";

import { PublicPortalMapItemDto, PublicPortalsMapResponseDto } from "../dto/public-portals.dto";

@ApiTags("Public Portals (map)")
@Controller("public/portals")
@Public()
export class PublicPortalsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly portalResolution: PortalResolutionService
    ) {}

    @Get("map")
    @ApiOperation({ summary: "Клубы, опубликованные на карте, со средним рейтингом" })
    @ApiSuccessResponse(PublicPortalsMapResponseDto)
    async map(): Promise<PublicPortalsMapResponseDto> {
        const portals = await this.prisma.portal.findMany({
            where: { status: PortalStatus.active, isListedOnMap: true },
            orderBy: { displayName: "asc" },
        });

        const ratings = await this.prisma.portalReview.groupBy({
            by: ["portalId"],
            where: { portalId: { in: portals.map((p) => p.id) } },
            _avg: { score: true },
            _count: { _all: true },
        });
        const ratingByPortal = new Map(ratings.map((r) => [r.portalId, r]));

        return {
            portals: portals.map((p) => this.toMapItem(p, ratingByPortal.get(p.id))),
        };
    }

    @Get(":slug")
    @ApiOperation({ summary: "Публичная карточка клуба по slug" })
    @ApiSuccessResponse(PublicPortalMapItemDto)
    @ApiErrorResponse([404])
    async bySlug(@Param("slug") slug: string): Promise<PublicPortalMapItemDto> {
        const portal = await this.portalResolution.findActiveByIdOrSlug(undefined, slug);
        if (!portal) {
            throw new NotFoundException("Portal not found");
        }
        const rating = await this.prisma.portalReview.aggregate({
            where: { portalId: portal.id },
            _avg: { score: true },
            _count: { _all: true },
        });
        return this.toMapItem(portal, {
            _avg: rating._avg,
            _count: rating._count,
        });
    }

    private toMapItem(
        portal: {
            id: string;
            name: string;
            displayName: string;
            publicDescription: string | null;
            coverImageUrl: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
            latitude: unknown;
            longitude: unknown;
        },
        rating?: { _avg: { score: number | null }; _count: { _all: number } }
    ): PublicPortalMapItemDto {
        return {
            id: portal.id,
            slug: portal.name,
            displayName: portal.displayName,
            publicDescription: portal.publicDescription,
            coverImageUrl: portal.coverImageUrl,
            address: portal.address,
            city: portal.city,
            country: portal.country,
            latitude: portal.latitude === null ? null : Number(portal.latitude),
            longitude: portal.longitude === null ? null : Number(portal.longitude),
            averageRating: rating?._avg.score !== null && rating?._avg.score !== undefined
                ? Math.round(rating._avg.score * 10) / 10
                : null,
            reviewsCount: rating?._count._all ?? 0,
        };
    }
}
