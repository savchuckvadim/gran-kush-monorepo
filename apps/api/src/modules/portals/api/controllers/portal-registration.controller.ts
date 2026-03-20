import { Body, Controller, Ip, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthCookieService } from "@auth/shared/application/services/auth-cookie.service";
import { AuthSessionService } from "@auth/shared/application/services/auth-session.service";
import type { Request, Response } from "express";

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
        private readonly cookieService: AuthCookieService,
        private readonly authSessionService: AuthSessionService
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
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
        @Ip() ip: string
    ): Promise<RegisterPortalResponseDto> {
        const result = await this.portalRegistrationService.registerPortal(dto);
        this.cookieService.setAuthCookies(response, "crm", result.tokens);
        await this.authSessionService.createSession({
            portalId: result.portal.id,
            employeeId: result.owner.id,
            refreshToken: result.tokens.refreshToken,
            expiresAt: this.resolveRefreshExpiry(),
            ipAddress: ip,
            userAgent: request.headers["user-agent"] || null,
        });

        return {
            portal: result.portal,
            owner: {
                id: result.owner.id,
                email: result.owner.email,
                name: result.owner.name,
                role: result.owner.role,
            },
            accessToken: result.tokens.accessToken,
        };
    }

    private resolveRefreshExpiry(): Date {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        return expiresAt;
    }
}
