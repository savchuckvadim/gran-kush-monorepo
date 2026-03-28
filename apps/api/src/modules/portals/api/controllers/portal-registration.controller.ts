import { Body, Controller, Headers, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import type { Response } from "express";

import { AUTH_GLOBAL_SCOPE, resolveDeviceIdFromHeaders } from "@common/auth";
import { AuthCookieService } from "@common/cookie/services/auth-cookie.service";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RegisterPortalDto } from "@modules/portals/api/dto/register-portal.dto";
import { RegisterPortalResponseDto } from "@modules/portals/api/dto/register-portal-response.dto";
import { PortalRegistrationService } from "@modules/portals/application/services/portal-registration.service";

@ApiTags("Platform Portals")
@Controller("platform/portals")
export class PortalRegistrationController {
    constructor(
        private readonly portalRegistrationService: PortalRegistrationService,
        private readonly cookieService: AuthCookieService
    ) {}

    @Post("register")
    @Public()
    @ApiOperation({ summary: "Register new portal and root owner employee" })
    @ApiSuccessResponse(RegisterPortalResponseDto, {
        description: "Portal and owner created successfully",
    })
    @ApiErrorResponse([400, 409])
    async register(
        @Body() dto: RegisterPortalDto,
        @Headers() headers: Record<string, string | string[] | undefined>,
        @Res({ passthrough: true }) response: Response
    ): Promise<RegisterPortalResponseDto> {
        const deviceId = resolveDeviceIdFromHeaders(headers);
        const result = await this.portalRegistrationService.registerPortal(dto, deviceId);
        this.cookieService.setAuthCookies(response, AUTH_GLOBAL_SCOPE.CRM, result.tokens);

        return {
            portal: result.portal,
            owner: {
                id: result.owner.id,
                email: result.owner.email,
                name: result.owner.name,
                role: result.owner.role,
            },
            deviceId,
        };
    }
}
