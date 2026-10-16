import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import type { Member } from "@prisma/client";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CurrentMember, RequireMemberJwt } from "@modules/portal/auth/members";
import { MonthlyLimitDto } from "@modules/portal/crm/orders/api/dto/monthly-limit.dto";
import { MonthlyLimitStatusService } from "@modules/portal/crm/orders/application/services/monthly-limit-status.service";

/** Мой лимит в клубе из адреса: сколько отпущено за 30 дней и сколько ещё можно заказать. */
@ApiTags("Cabinet Monthly Limit")
@Controller("cabinet/club/monthly-limit")
@RequireMemberJwt()
export class CabinetMonthlyLimitController {
    constructor(private readonly limits: MonthlyLimitStatusService) {}

    @Get()
    @ApiOperation({ summary: "Мой лимит: действующий, отпущено и осталось за 30 дней" })
    @ApiSuccessResponse(MonthlyLimitDto)
    @ApiErrorResponse([401, 403, 404])
    async get(@CurrentMember() member: Member): Promise<MonthlyLimitDto> {
        return this.limits.statusFor(member.id, member.portalId);
    }
}
