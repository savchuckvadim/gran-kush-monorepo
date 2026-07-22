import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

import { RegistrationLinksService } from "../../application/services/registration-links.service";
import {
    PublicRegistrationLinkInfoDto,
    RegisterViaLinkDto,
    RegisterViaLinkResponseDto,
} from "../dto/registration-link.dto";

@ApiTags("Public Registration Links")
@Controller("public/reg-links")
@Public()
export class PublicRegistrationLinksController {
    constructor(private readonly registrationLinksService: RegistrationLinksService) {}

    @Get(":token")
    @ApiOperation({ summary: "Портал и схема формы по токену ссылки-регистрации" })
    @ApiSuccessResponse(PublicRegistrationLinkInfoDto)
    @ApiErrorResponse([404])
    async info(@Param("token") token: string): Promise<PublicRegistrationLinkInfoDto> {
        return this.registrationLinksService.getPublicInfo(token);
    }

    @Post(":token/register")
    @ApiOperation({
        summary: "Регистрация member по ссылке-форме (создаёт/клеймит аккаунт + вступление)",
    })
    @ApiSuccessResponse(RegisterViaLinkResponseDto, { status: 201 })
    @ApiErrorResponse([400, 404, 409])
    async register(
        @Param("token") token: string,
        @Body() dto: RegisterViaLinkDto
    ): Promise<RegisterViaLinkResponseDto> {
        return this.registrationLinksService.registerViaLink(token, dto);
    }
}
