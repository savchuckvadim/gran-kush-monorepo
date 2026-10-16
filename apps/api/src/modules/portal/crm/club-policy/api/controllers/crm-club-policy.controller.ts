import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import {
    RequireAdmin,
    RequireEmployeeJwt,
} from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";

import { ClubPolicyService } from "../../application/services/club-policy.service";
import { ClubPolicyDto, UpdateClubPolicyDto } from "../dto/club-policy.dto";

/** Правила клуба для участников: вступление, каталог вне клуба, одобрение для заказа, заказ на себя. */
@ApiTags("CRM Club Policy")
@Controller("crm/settings/club-policy")
@RequireEmployeeJwt()
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
    @RequireAdmin()
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
