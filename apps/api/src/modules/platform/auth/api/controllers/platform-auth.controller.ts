import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Request } from "express";

import { AUTH_THROTTLE } from "@common/config/throttler/throttler.config";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import {
    PlatformLoginDto,
    PlatformLoginResponseDto,
    PlatformRefreshTokenDto,
    PlatformSessionTokensDto,
} from "@modules/platform/auth/api/dto/platform-login.dto";
import { PlatformAuthService } from "@modules/platform/auth/application/services/platform-auth.service";
import { sessionClientOf } from "@modules/portal/auth/sessions/api/session-http.service";

@ApiTags("Platform auth")
@Controller("platform/auth")
export class PlatformAuthController {
    constructor(private readonly platformAuth: PlatformAuthService) {}

    @Post("login")
    @Public()
    @Throttle(AUTH_THROTTLE)
    @ApiOperation({ summary: "Платформенный админ: вход, сессия с access и refresh в теле" })
    @ApiSuccessResponse(PlatformLoginResponseDto)
    @ApiErrorResponse([400, 401])
    login(
        @Body() dto: PlatformLoginDto,
        @Req() request: Request
    ): Promise<PlatformLoginResponseDto> {
        return this.platformAuth.login(dto.email, dto.password, sessionClientOf(request));
    }

    @Post("refresh")
    @Public()
    @Throttle(AUTH_THROTTLE)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Платформенный админ: новая пара токенов, прежний refresh гаснет" })
    @ApiSuccessResponse(PlatformSessionTokensDto)
    @ApiErrorResponse([400, 401])
    refresh(@Body() dto: PlatformRefreshTokenDto): Promise<PlatformSessionTokensDto> {
        return this.platformAuth.refresh(dto.refreshToken);
    }

    @Post("logout")
    @Public()
    @Throttle(AUTH_THROTTLE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Платформенный админ: выход, сессия гасится сразу" })
    @ApiErrorResponse([400])
    async logout(@Body() dto: PlatformRefreshTokenDto): Promise<void> {
        await this.platformAuth.logout(dto.refreshToken);
    }
}
