import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { PUBLIC_TOKEN_THROTTLE } from "@common/config/throttler/throttler.config";
import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { RegistrationLinksService } from "../../application/services/registration-links.service";
import { JoinViaLinkDto, JoinViaLinkResponseDto } from "../dto/registration-link.dto";

/**
 * Вступление по ссылке клуба под своей сессией. Клуб в заголовке не нужен: портал определяет
 * сама ссылка.
 */
@ApiTags("Cabinet Registration Links")
@Controller("cabinet/reg-links")
@RequireUserJwt()
export class CabinetRegistrationLinksController {
    constructor(private readonly registrationLinksService: RegistrationLinksService) {}

    @Post(":token/join")
    @Throttle(PUBLIC_TOKEN_THROTTLE)
    @ApiOperation({
        summary:
            "Вступить в клуб по ссылке-форме под текущей сессией; документы — только по выбору",
    })
    @ApiSuccessResponse(JoinViaLinkResponseDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async join(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("token") token: string,
        @Body() dto: JoinViaLinkDto
    ): Promise<JoinViaLinkResponseDto> {
        return this.registrationLinksService.joinViaLinkAsUser(token, user.userId, dto);
    }
}
