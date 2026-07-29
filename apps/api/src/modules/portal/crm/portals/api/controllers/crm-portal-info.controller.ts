import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireEmployeeJwtWithoutSubscriptionGate } from "@modules/portal/auth/employees";
import { PortalInfoDto } from "@modules/portal/crm/portals/api/dto/portal-info.dto";
import { PortalResolutionService } from "@modules/portal/crm/portals/application/services/portal-resolution.service";

@ApiTags("CRM Portal")
@Controller("crm/portal")
@RequireEmployeeJwtWithoutSubscriptionGate()
@ApiBearerAuth()
export class CrmPortalInfoController {
    constructor(private readonly portalResolution: PortalResolutionService) {}

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
            subscription: portal.subscription
                ? {
                      status: portal.subscription.status,
                      planName: portal.subscription.planName,
                      graceEndsAt: portal.subscription.graceEndsAt?.toISOString() ?? null,
                  }
                : null,
        };
    }
}
