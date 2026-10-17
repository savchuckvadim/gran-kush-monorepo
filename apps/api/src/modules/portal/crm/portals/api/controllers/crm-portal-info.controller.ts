import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import {
    PortalAppearanceDto,
    UpdatePortalAppearanceDto,
} from "@modules/portal/crm/portals/api/dto/portal-appearance.dto";
import { PortalInfoDto } from "@modules/portal/crm/portals/api/dto/portal-info.dto";
import { PortalAppearanceService } from "@modules/portal/crm/portals/application/services/portal-appearance.service";
import { PortalResolutionService } from "@modules/portal/crm/portals/application/services/portal-resolution.service";

@ApiTags("CRM Portal")
@Controller("crm/portal")
@CrmAuth({ subscription: false })
@ApiBearerAuth()
export class CrmPortalInfoController {
    constructor(
        private readonly portalResolution: PortalResolutionService,
        private readonly appearance: PortalAppearanceService
    ) {}

    @Get("info")
    @ApiOperation({
        summary: "Инфо текущего портала со статусом подписки",
        description:
            "Доступен без subscription gate: banner и блок-страница CRM читают статус даже при истёкшей подписке.",
    })
    @ApiSuccessResponse(PortalInfoDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async getPortalInfo(@PortalId() portalId: string): Promise<PortalInfoDto> {
        const portal = await this.portalResolution.getInfoById(portalId);
        return {
            portalId: portal.id,
            name: portal.name,
            displayName: portal.displayName,
            type: portal.type,
            status: portal.status,
            defaultSkin: portal.defaultSkin,
            subscription: portal.subscription
                ? {
                      status: portal.subscription.status,
                      planName: portal.subscription.planName,
                      graceEndsAt: portal.subscription.graceEndsAt?.toISOString() ?? null,
                      trialEndsAt: portal.subscription.trialEndsAt?.toISOString() ?? null,
                      features: portal.subscription.features,
                  }
                : null,
        };
    }

    @Patch("appearance")
    @RequirePermission(PERMISSIONS.SettingsClub)
    @ApiOperation({
        summary: "Тема клуба по умолчанию для сотрудников и участников (settings.club)",
    })
    @ApiSuccessResponse(PortalAppearanceDto)
    @ApiErrorResponse([400, 401, 403])
    async updateAppearance(
        @PortalId() portalId: string,
        @Body() dto: UpdatePortalAppearanceDto
    ): Promise<PortalAppearanceDto> {
        await this.appearance.setDefaultSkin(portalId, dto.defaultSkin);
        return { defaultSkin: dto.defaultSkin };
    }
}
