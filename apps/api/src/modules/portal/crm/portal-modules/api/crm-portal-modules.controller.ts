import { BadRequestException, Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import {
    PortalModulesService,
    type PortalModuleState,
} from "../application/portal-modules.service";
import { isPortalModuleCode } from "../domain/portal-module.catalog";

import { PortalModuleDto, SetPortalModuleDto } from "./portal-module.dto";

const toDto = (state: PortalModuleState): PortalModuleDto => ({
    code: state.code,
    available: state.available,
    enabled: state.enabled,
    enabledAt: state.enabledAt?.toISOString() ?? null,
});

@ApiTags("CRM Portal")
@Controller("crm/portal/modules")
@CrmAuth({ subscription: false })
@ApiBearerAuth()
export class CrmPortalModulesController {
    constructor(private readonly modules: PortalModulesService) {}

    @Get()
    @ApiOperation({ summary: "Модули клуба: какие доступны его типу и какие включены" })
    @ApiSuccessResponse(PortalModuleDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async list(@PortalId() portalId: string): Promise<PortalModuleDto[]> {
        return (await this.modules.list(portalId)).map(toDto);
    }

    @Put(":code")
    @RequirePermission(PERMISSIONS.SettingsClub)
    @ApiOperation({
        summary:
            "Включить или выключить модуль (settings.club). Данные модуля при выключении не удаляются",
    })
    @ApiSuccessResponse(PortalModuleDto)
    @ApiErrorResponse([400, 401, 403])
    async set(
        @Param("code") code: string,
        @Body() dto: SetPortalModuleDto,
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<PortalModuleDto> {
        if (!isPortalModuleCode(code)) {
            throw new BadRequestException("Unknown module");
        }
        return toDto(
            await this.modules.setEnabled(portalId, code, dto.enabled, principal.membershipId)
        );
    }
}
