import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import type { Request, Response } from "express";

import { SIGNUP_THROTTLE } from "@common/config/throttler/throttler.config";
import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { SessionHttpService } from "@modules/portal/auth/sessions/api/session-http.service";
import { SESSION_AUDIENCES } from "@modules/portal/auth/sessions/domain/auth-session";
import { RegisterPortalDto } from "@modules/portal/crm/portals/api/dto/register-portal.dto";
import { RegisterPortalResponseDto } from "@modules/portal/crm/portals/api/dto/register-portal-response.dto";
import { PortalRegistrationService } from "@modules/portal/crm/portals/application/services/portal-registration.service";

@ApiTags("Platform Portals")
@Controller("platform/portals")
export class PortalRegistrationController {
    constructor(
        private readonly portalRegistrationService: PortalRegistrationService,
        private readonly sessionHttp: SessionHttpService
    ) {}

    @Post("register")
    @Throttle(SIGNUP_THROTTLE)
    @Public()
    @ApiOperation({ summary: "Register new portal and root owner employee" })
    @ApiSuccessResponse(RegisterPortalResponseDto, {
        description: "Portal and owner created successfully",
    })
    @ApiErrorResponse([400, 409])
    async register(
        @Body() dto: RegisterPortalDto,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response
    ): Promise<RegisterPortalResponseDto> {
        const result = await this.portalRegistrationService.registerPortal(dto);
        const { deviceId } = await this.sessionHttp.signIn(request, response, {
            userId: result.ownerUserId,
            audience: SESSION_AUDIENCES.Crm,
            method: "registration",
        });

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
