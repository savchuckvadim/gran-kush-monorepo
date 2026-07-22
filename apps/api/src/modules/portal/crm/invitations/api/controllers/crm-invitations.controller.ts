import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { EmployeeInvitation } from "@prisma/client";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { Admin } from "@modules/portal/auth/employees";
import { RequireEmployeeAdmin } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";

import { InvitationsService } from "../../application/services/invitations.service";
import {
    CreateInvitationDto,
    InvitationDto,
    InvitationListResponseDto,
    RevokeInvitationResponseDto,
} from "../dto/invitation.dto";

function toDto(i: EmployeeInvitation): InvitationDto {
    return {
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        token: i.token,
        expiresAt: i.expiresAt.toISOString(),
        acceptedAt: i.acceptedAt?.toISOString(),
        createdAt: i.createdAt.toISOString(),
    };
}

@ApiTags("CRM Employee Invitations")
@Controller("crm/settings/invitations")
@RequireEmployeeAdmin()
@Admin()
export class CrmInvitationsController {
    constructor(private readonly invitationsService: InvitationsService) {}

    @Post()
    @ApiOperation({ summary: "Пригласить сотрудника по email (admin)" })
    @ApiSuccessResponse(InvitationDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 409])
    async create(
        @Body() dto: CreateInvitationDto,
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<InvitationDto> {
        const invitation = await this.invitationsService.create(
            dto,
            portalId,
            principal.membershipId
        );
        return toDto(invitation);
    }

    @Get()
    @ApiOperation({ summary: "Список приглашений портала (admin)" })
    @ApiSuccessResponse(InvitationListResponseDto)
    @ApiErrorResponse([401, 403])
    async list(@PortalId() portalId: string): Promise<InvitationListResponseDto> {
        const invitations = await this.invitationsService.listByPortal(portalId);
        return { invitations: invitations.map(toDto) };
    }

    @Delete(":id")
    @ApiOperation({ summary: "Отозвать приглашение (admin)" })
    @ApiSuccessResponse(RevokeInvitationResponseDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async revoke(
        @Param("id") id: string,
        @PortalId() portalId: string
    ): Promise<RevokeInvitationResponseDto> {
        await this.invitationsService.revoke(id, portalId);
        return { revoked: true };
    }
}
