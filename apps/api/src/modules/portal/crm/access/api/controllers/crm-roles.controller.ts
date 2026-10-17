import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";

import { PortalRolesService } from "../../application/services/portal-roles.service";
import { PERMISSIONS } from "../../domain/permissions";
import {
    CreatePortalRoleDto,
    PortalRoleDto,
    PortalRolesResponseDto,
    UpdatePortalRoleDto,
} from "../dto/portal-role.dto";
import { permissionCatalogDto, toPortalRoleDto } from "../mappers/portal-role.mapper";

/**
 * «Настройки → Роли и права». Список ролей открыт любому сотруднику (название и права роли — не секрет,
 * а выбор роли нужен на карточке сотрудника); менять — `roles.manage` и не шире своих прав.
 */
@ApiTags("CRM Roles")
@Controller("crm/settings/roles")
@CrmAuth()
export class CrmRolesController {
    constructor(private readonly roles: PortalRolesService) {}

    @Get()
    @ApiOperation({ summary: "Роли клуба и каталог прав" })
    @ApiSuccessResponse(PortalRolesResponseDto)
    @ApiErrorResponse([401, 403])
    async list(@PortalId() portalId: string): Promise<PortalRolesResponseDto> {
        const roles = await this.roles.list(portalId);
        return { roles: roles.map(toPortalRoleDto), catalog: permissionCatalogDto() };
    }

    @Post()
    @RequirePermission(PERMISSIONS.RolesManage)
    @ApiOperation({ summary: "Своя роль клуба" })
    @ApiSuccessResponse(PortalRoleDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403])
    async create(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Body() dto: CreatePortalRoleDto
    ): Promise<PortalRoleDto> {
        const role = await this.roles.create(portalId, dto, principal.permissions);
        return toPortalRoleDto({ ...role, employeeCount: 0 });
    }

    @Patch(":id")
    @RequirePermission(PERMISSIONS.RolesManage)
    @ApiOperation({ summary: "Название своей роли и права роли (кроме владельца и админа)" })
    @ApiSuccessResponse(PortalRoleDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async update(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string,
        @Body() dto: UpdatePortalRoleDto
    ): Promise<PortalRoleDto> {
        return toPortalRoleDto(await this.roles.update(id, portalId, dto, principal.permissions));
    }

    @Delete(":id")
    @HttpCode(204)
    @RequirePermission(PERMISSIONS.RolesManage)
    @ApiOperation({ summary: "Удалить свою роль без сотрудников и ждущих приглашений" })
    @ApiErrorResponse([401, 403, 404, 409])
    async delete(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string
    ): Promise<void> {
        await this.roles.delete(id, portalId, principal.permissions);
    }
}
