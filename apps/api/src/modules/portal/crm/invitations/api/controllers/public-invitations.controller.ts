import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { Public } from "@common/decorators/auth/public.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

import { InvitationsService } from "../../application/services/invitations.service";
import {
    AcceptInvitationDto,
    AcceptInvitationResponseDto,
    PublicInvitationInfoDto,
} from "../dto/invitation.dto";

@ApiTags("Public Employee Invitations")
@Controller("public/invitations")
@Public()
export class PublicInvitationsController {
    constructor(
        private readonly invitationsService: InvitationsService,
        private readonly userRepository: UserRepository
    ) {}

    @Get(":token")
    @ApiOperation({ summary: "Информация о приглашении по токену" })
    @ApiSuccessResponse(PublicInvitationInfoDto)
    @ApiErrorResponse([404])
    async info(@Param("token") token: string): Promise<PublicInvitationInfoDto> {
        const invitation = await this.invitationsService.getActiveByToken(token);
        const user = await this.userRepository.findByEmail(invitation.email);
        return {
            email: invitation.email,
            role: invitation.role,
            portalSlug: invitation.portal.name,
            portalDisplayName: invitation.portal.displayName,
            accountExists: user !== null && user.passwordHash !== null,
        };
    }

    @Post(":token/accept")
    @ApiOperation({
        summary:
            "Принять приглашение: создаёт/клеймит аккаунт (password обязателен для новых) и Employee",
    })
    @ApiSuccessResponse(AcceptInvitationResponseDto, { status: 201 })
    @ApiErrorResponse([400, 404, 409])
    async accept(
        @Param("token") token: string,
        @Body() dto: AcceptInvitationDto
    ): Promise<AcceptInvitationResponseDto> {
        return this.invitationsService.accept(token, dto);
    }
}
