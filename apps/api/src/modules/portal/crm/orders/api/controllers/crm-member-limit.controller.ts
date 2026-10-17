import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import {
    MonthlyLimitDto,
    UpdateMemberLimitDto,
} from "@modules/portal/crm/orders/api/dto/monthly-limit.dto";
import { MonthlyLimitStatusService } from "@modules/portal/crm/orders/application/services/monthly-limit-status.service";

/** Лимит отпуска участнику в карточке CRM: расход за 30 дней и личный лимит. */
@ApiTags("CRM Member Limit")
@Controller("crm/members/:memberId/monthly-limit")
@CrmAuth()
@RequirePermission(PERMISSIONS.MembersRead)
export class CrmMemberLimitController {
    constructor(private readonly limits: MonthlyLimitStatusService) {}

    @Get()
    @ApiOperation({ summary: "Лимит участника: действующий, отпущено и осталось за 30 дней" })
    @ApiSuccessResponse(MonthlyLimitDto)
    @ApiErrorResponse([401, 403, 404])
    async get(
        @Param("memberId") memberId: string,
        @PortalId() portalId: string
    ): Promise<MonthlyLimitDto> {
        return this.limits.statusFor(memberId, portalId);
    }

    @Patch()
    @RequirePermission(PERMISSIONS.MembersEdit)
    @ApiOperation({ summary: "Личный лимит участника (members.edit); null — лимит клуба" })
    @ApiSuccessResponse(MonthlyLimitDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async update(
        @Param("memberId") memberId: string,
        @PortalId() portalId: string,
        @Body() dto: UpdateMemberLimitDto
    ): Promise<MonthlyLimitDto> {
        return this.limits.setPersonal(memberId, portalId, dto.monthlyLimitGrams);
    }
}
