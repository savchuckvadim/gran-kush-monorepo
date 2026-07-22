import { Body, Controller, Get, NotFoundException, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Portal, Prisma } from "@prisma/client";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { Admin } from "@modules/portal/auth/employees";
import { RequireEmployeeAdmin } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";

import { PortalSettingsDto, UpdatePortalSettingsDto } from "../dto/public-portals.dto";

@ApiTags("CRM Portal Settings")
@Controller("crm/settings/portal")
@RequireEmployeeAdmin()
@Admin()
export class CrmPortalSettingsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @ApiOperation({ summary: "Настройки портала: публичность, гео, описание (admin)" })
    @ApiSuccessResponse(PortalSettingsDto)
    @ApiErrorResponse([401, 403, 404])
    async get(@PortalId() portalId: string): Promise<PortalSettingsDto> {
        const portal = await this.prisma.portal.findUnique({ where: { id: portalId } });
        if (!portal) {
            throw new NotFoundException("Portal not found");
        }
        return this.toDto(portal);
    }

    @Patch()
    @ApiOperation({ summary: "Обновить настройки портала (admin)" })
    @ApiSuccessResponse(PortalSettingsDto)
    @ApiErrorResponse([400, 401, 403])
    async update(
        @PortalId() portalId: string,
        @Body() dto: UpdatePortalSettingsDto
    ): Promise<PortalSettingsDto> {
        const data: Prisma.PortalUpdateInput = {
            ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
            ...(dto.publicDescription !== undefined
                ? { publicDescription: dto.publicDescription }
                : {}),
            ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
            ...(dto.address !== undefined ? { address: dto.address } : {}),
            ...(dto.city !== undefined ? { city: dto.city } : {}),
            ...(dto.country !== undefined ? { country: dto.country } : {}),
            ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
            ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
            ...(dto.isListedOnMap !== undefined ? { isListedOnMap: dto.isListedOnMap } : {}),
        };
        const portal = await this.prisma.portal.update({ where: { id: portalId }, data });
        return this.toDto(portal);
    }

    private toDto(portal: Portal): PortalSettingsDto {
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
            isListedOnMap: portal.isListedOnMap,
            averageRating: null,
            reviewsCount: 0,
        };
    }
}
