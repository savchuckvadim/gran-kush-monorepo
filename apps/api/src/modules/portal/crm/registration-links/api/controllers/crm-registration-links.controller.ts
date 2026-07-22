import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { RegistrationLink } from "@prisma/client";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { Admin } from "@modules/portal/auth/employees";
import { RequireEmployeeAdmin } from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";

import { RegistrationLinksService } from "../../application/services/registration-links.service";
import {
    CreateRegistrationLinkDto,
    RegistrationLinkDto,
    RegistrationLinkListResponseDto,
    UpdateRegistrationLinkDto,
} from "../dto/registration-link.dto";

function toDto(link: RegistrationLink): RegistrationLinkDto {
    return {
        id: link.id,
        name: link.name,
        kind: link.kind,
        token: link.token,
        isActive: link.isActive,
        expiresAt: link.expiresAt?.toISOString() ?? null,
        maxUses: link.maxUses,
        usesCount: link.usesCount,
        createdAt: link.createdAt.toISOString(),
    };
}

@ApiTags("CRM Registration Links")
@Controller("crm/settings/registration-links")
@RequireEmployeeAdmin()
@Admin()
export class CrmRegistrationLinksController {
    constructor(private readonly registrationLinksService: RegistrationLinksService) {}

    @Post()
    @ApiOperation({ summary: "Создать ссылку-форму регистрации member (admin)" })
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
    @ApiOperation({ summary: "Список ссылок-форм портала (admin)" })
    @ApiSuccessResponse(RegistrationLinkListResponseDto)
    @ApiErrorResponse([401, 403])
    async list(@PortalId() portalId: string): Promise<RegistrationLinkListResponseDto> {
        const links = await this.registrationLinksService.listByPortal(portalId);
        return { links: links.map(toDto) };
    }

    @Patch(":id")
    @ApiOperation({ summary: "Обновить/деактивировать ссылку-форму (admin)" })
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
}
