import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { PUBLIC_TOKEN_THROTTLE } from "@common/config/throttler/throttler.config";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

import { MemberConsentService } from "../../application/services/member-consent.service";
import {
    ConfirmMemberConsentDto,
    DeclineMemberConsentDto,
    MemberConsentResultDto,
    PublicMemberConsentInfoDto,
} from "../dto/member-consent.dto";

/** Страница из письма «клуб добавил вас»: владелец аккаунта подтверждает членство паролем. */
@ApiTags("Public Membership Consent")
@Controller("public/consent")
@Public()
export class PublicMemberConsentController {
    constructor(private readonly consent: MemberConsentService) {}

    @Get(":token")
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({ summary: "Клуб, email и документы аккаунта по токену из письма" })
    @ApiSuccessResponse(PublicMemberConsentInfoDto)
    @ApiErrorResponse([404])
    async info(@Param("token") token: string): Promise<PublicMemberConsentInfoDto> {
        return this.consent.getPublicInfo(token);
    }

    @Post(":token/confirm")
    @HttpCode(200)
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({
        summary: "Подтвердить членство паролем аккаунта и выбрать, что показать клубу",
    })
    @ApiSuccessResponse(MemberConsentResultDto)
    @ApiErrorResponse([400, 401, 404])
    async confirm(
        @Param("token") token: string,
        @Body() dto: ConfirmMemberConsentDto
    ): Promise<MemberConsentResultDto> {
        return this.consent.confirm(token, dto);
    }

    @Post(":token/decline")
    @HttpCode(200)
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({ summary: "Отказаться: членство удаляется" })
    @ApiSuccessResponse(MemberConsentResultDto)
    @ApiErrorResponse([401, 404])
    async decline(
        @Param("token") token: string,
        @Body() dto: DeclineMemberConsentDto
    ): Promise<MemberConsentResultDto> {
        return this.consent.decline(token, dto);
    }
}
