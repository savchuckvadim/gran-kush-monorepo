import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { RegistrationLink } from "@prisma/client";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import {
    type RegistrationLinkListItem,
    RegistrationLinksService,
} from "../../application/services/registration-links.service";
import {
    CreateRegistrationLinkDto,
    RegistrationLinkDto,
    RegistrationLinkListQueryDto,
    RegistrationLinkListResponseDto,
    UpdateRegistrationLinkDto,
} from "../dto/registration-link.dto";

function toDto(
    link: RegistrationLink & Partial<Pick<RegistrationLinkListItem, "online" | "createdByEmployee">>
): RegistrationLinkDto {
    return {
        id: link.id,
        name: link.name,
        kind: link.kind,
        token: link.token,
        isActive: link.isActive,
        status: RegistrationLinksService.statusOf(link),
        expiresAt: link.expiresAt?.toISOString() ?? null,
        maxUses: link.maxUses,
        usesCount: link.usesCount,
        online: link.online ?? 0,
        hasPrefill: link.prefillJson !== null && link.prefillJson !== undefined,
        createdBy: link.createdByEmployee
            ? { employeeId: link.createdByEmployee.id, email: link.createdByEmployee.user.email }
            : null,
        revokedAt: link.revokedAt?.toISOString() ?? null,
        createdAt: link.createdAt.toISOString(),
    };
}

@ApiTags("CRM Registration Links")
@Controller("crm/settings/registration-links")
@CrmAuth()
@RequirePermission(PERMISSIONS.MembersInvite)
export class CrmRegistrationLinksController {
    constructor(private readonly registrationLinksService: RegistrationLinksService) {}

    @Post()
    @ApiOperation({ summary: "Создать ссылку-форму регистрации member (members.invite)" })
    @ApiSuccessResponse(RegistrationLinkDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403])
    async create(
        @Body() dto: CreateRegistrationLinkDto,
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<RegistrationLinkDto> {
        const link = await this.registrationLinksService.create(
            dto,
            portalId,
            principal.membershipId
        );
        return toDto(link);
    }

    @Get()
    @ApiOperation({
        summary: "Ссылки-формы портала постранично, со статусом и онлайном (members.invite)",
    })
    @ApiSuccessResponse(RegistrationLinkListResponseDto)
    @ApiErrorResponse([400, 401, 403])
    async list(
        @PortalId() portalId: string,
        @Query() query: RegistrationLinkListQueryDto
    ): Promise<RegistrationLinkListResponseDto> {
        const { page = 1, limit = 20, status } = query;
        const result = await this.registrationLinksService.listPage(portalId, page, limit, status);
        return { ...result, links: result.items.map(toDto) };
    }

    @Patch(":id")
    @ApiOperation({ summary: "Обновить/деактивировать ссылку-форму (members.invite)" })
    @ApiSuccessResponse(RegistrationLinkDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateRegistrationLinkDto,
        @PortalId() portalId: string
    ): Promise<RegistrationLinkDto> {
        const link = await this.registrationLinksService.update(id, portalId, dto);
        return toDto(link);
    }

    @Post(":id/revoke")
    @ApiOperation({ summary: "Отозвать ссылку-форму навсегда (members.invite)" })
    @ApiSuccessResponse(RegistrationLinkDto)
    @ApiErrorResponse([401, 403, 404])
    async revoke(
        @Param("id") id: string,
        @PortalId() portalId: string
    ): Promise<RegistrationLinkDto> {
        const link = await this.registrationLinksService.revoke(id, portalId);
        return toDto(link);
    }
}
