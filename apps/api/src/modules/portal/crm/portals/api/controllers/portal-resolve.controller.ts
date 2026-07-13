import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PortalResolutionService } from "@modules/portal/crm/portals/application/services/portal-resolution.service";

class PortalResolveResponseDto {
    portalId!: string;
    displayName!: string;
    status!: string;
}

@ApiTags("Portal")
@Controller("crm/portals")
export class PortalResolveController {
    constructor(private readonly portalResolutionService: PortalResolutionService) {}

    @Get("resolve")
    @ApiOperation({ summary: "Resolve portal by slug — public endpoint for SSR" })
    @ApiQuery({ name: "slug", required: true, description: "Portal slug (name)" })
    @ApiSuccessResponse(PortalResolveResponseDto)
    @ApiErrorResponse([404])
    async resolve(@Query("slug") slug: string): Promise<PortalResolveResponseDto> {
        const portal = await this.portalResolutionService.findActiveByIdOrSlug(undefined, slug);
        return { portalId: portal!.id, displayName: portal!.displayName, status: portal!.status };
    }
}
