import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { BrandModuleRoutes } from "@common/brand/brand-module.guard";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { ClubPolicyService } from "../../application/services/club-policy.service";
import { ClubPolicyDto, UpdateClubPolicyDto } from "../dto/club-policy.dto";

/** Правила клуба для участников: вступление, каталог вне клуба, одобрение для заказа, заказ на себя. */
@ApiTags("CRM Club Policy")
@Controller("crm/settings/club-policy")
@CrmAuth()
@BrandModuleRoutes("club-policy")
export class CrmClubPolicyController {
    constructor(private readonly policies: ClubPolicyService) {}

    @Get()
    @ApiOperation({ summary: "Правила клуба (сохранённые или по умолчанию)" })
    @ApiSuccessResponse(ClubPolicyDto)
    @ApiErrorResponse([401, 403])
    async get(@PortalId() portalId: string): Promise<ClubPolicyDto> {
        return this.policies.get(portalId);
    }

    @Patch()
    @RequirePermission(PERMISSIONS.SettingsClub)
    @ApiOperation({ summary: "Изменить правила клуба; не названные поля остаются как были" })
    @ApiSuccessResponse(ClubPolicyDto)
    @ApiErrorResponse([400, 401, 403])
    async update(
        @PortalId() portalId: string,
        @Body() dto: UpdateClubPolicyDto
    ): Promise<ClubPolicyDto> {
        return this.policies.update(portalId, dto);
    }
}
