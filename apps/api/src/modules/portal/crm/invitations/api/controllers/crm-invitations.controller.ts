import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import type { PortalPrincipal } from "@common/portal";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";
import { toEmployeeRoleDto } from "@modules/portal/crm/access/api/mappers/portal-role.mapper";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import { toEmployeeActor } from "@modules/portal/crm/employees/application/services/employees.service";

import {
    InvitationsService,
    type InvitationWithRole,
} from "../../application/services/invitations.service";
import {
    CreatedInvitationDto,
    CreateInvitationDto,
    InvitationDto,
    InvitationListResponseDto,
    RevokeInvitationResponseDto,
} from "../dto/invitation.dto";

function toDto(i: InvitationWithRole): InvitationDto {
    return {
        id: i.id,
        email: i.email,
        role: toEmployeeRoleDto(i.role),
        status: i.status,
        expiresAt: i.expiresAt.toISOString(),
        acceptedAt: i.acceptedAt?.toISOString(),
        createdAt: i.createdAt.toISOString(),
    };
}

@ApiTags("CRM Employee Invitations")
@Controller("crm/settings/invitations")
@RequireEmployeeJwt()
@RequirePermission(PERMISSIONS.EmployeesManage)
export class CrmInvitationsController {
    constructor(private readonly invitationsService: InvitationsService) {}

    @Post()
    @ApiOperation({
        summary: "Пригласить сотрудника по email (employees.manage): ссылка уходит письмом",
    })
    @ApiSuccessResponse(CreatedInvitationDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 409])
    async create(
        @Body() dto: CreateInvitationDto,
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @RequestLocale() locale: ContentLocale
    ): Promise<CreatedInvitationDto> {
        const { invitation, token } = await this.invitationsService.create(
            dto,
            portalId,
            toEmployeeActor(principal),
            locale
        );
        return { ...toDto(invitation), token };
    }

    @Get()
    @ApiOperation({ summary: "Список приглашений портала (employees.manage)" })
    @ApiSuccessResponse(InvitationListResponseDto)
    @ApiErrorResponse([401, 403])
    async list(@PortalId() portalId: string): Promise<InvitationListResponseDto> {
        const invitations = await this.invitationsService.listByPortal(portalId);
        return { invitations: invitations.map(toDto) };
    }

    @Delete(":id")
    @ApiOperation({ summary: "Отозвать приглашение (employees.manage)" })
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
