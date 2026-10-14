import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { IsString, MinLength } from "class-validator";

import { PUBLIC_TOKEN_THROTTLE } from "@common/config/throttler/throttler.config";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PortalResolutionService } from "@modules/portal/crm/portals/application/services/portal-resolution.service";

class PortalResolveQueryDto {
    @IsString()
    @MinLength(1)
    slug!: string;
}

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
    @Public()
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({ summary: "Resolve portal by slug — public endpoint for SSR" })
    @ApiSuccessResponse(PortalResolveResponseDto)
    @ApiErrorResponse([400, 404])
    async resolve(@Query() query: PortalResolveQueryDto): Promise<PortalResolveResponseDto> {
        // Пустой slug раньше ронял хендлер в 500; теперь его отсекает DTO (400)
        const portal = await this.portalResolutionService.findActiveBySlug(query.slug);
        return { portalId: portal.id, displayName: portal.displayName, status: portal.status };
    }
}
