import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CabinetSession } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { MemberConsentService } from "../../application/services/member-consent.service";
import { ConfirmMyMembershipDto, MyMembershipsResponseDto } from "../dto/cabinet-memberships.dto";
import { MemberConsentResultDto } from "../dto/member-consent.dto";

/**
 * Членства аккаунта под его сессией. Клуб, который завёл человека по email, остаётся «ждущим»,
 * пока тот сам не подтвердит; здесь же — отказ и выход. Клуб не нужен в заголовке: маршруты
 * работают на уровне аккаунта и доступны и до подтверждения (TASK-703).
 */
@ApiTags("Cabinet Memberships (my memberships)")
@Controller("cabinet/memberships")
@CabinetSession()
export class CabinetMembershipsController {
    constructor(private readonly consent: MemberConsentService) {}

    @Get()
    @ApiOperation({ summary: "Все мои членства, в том числе ждущие подтверждения" })
    @ApiSuccessResponse(MyMembershipsResponseDto)
    @ApiErrorResponse([401])
    async list(@CurrentAuthUser() user: AuthenticatedUser): Promise<MyMembershipsResponseDto> {
        return { memberships: await this.consent.listMine(user.userId) };
    }

    @Post(":id/confirm")
    @HttpCode(200)
    @ApiOperation({
        summary: "Подтвердить членство под своей сессией и выбрать, что показать клубу",
    })
    @ApiSuccessResponse(MemberConsentResultDto)
    @ApiErrorResponse([400, 401, 404])
    async confirm(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("id") id: string,
        @Body() dto: ConfirmMyMembershipDto
    ): Promise<MemberConsentResultDto> {
        return this.consent.confirmMine(user.userId, id, dto);
    }

    @Post(":id/decline")
    @HttpCode(200)
    @ApiOperation({ summary: "Отказаться от ждущего членства: оно удаляется" })
    @ApiSuccessResponse(MemberConsentResultDto)
    @ApiErrorResponse([401, 404])
    async decline(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("id") id: string
    ): Promise<MemberConsentResultDto> {
        return this.consent.declineMine(user.userId, id);
    }

    @Post(":id/leave")
    @HttpCode(200)
    @ApiOperation({
        summary: "Выйти из клуба: членство закрывается, показ документов и подписи отзывается",
    })
    @ApiSuccessResponse(MemberConsentResultDto)
    @ApiErrorResponse([401, 404])
    async leave(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("id") id: string
    ): Promise<MemberConsentResultDto> {
        return this.consent.leaveMine(user.userId, id);
    }
}
