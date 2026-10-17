import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { PresenceSettingsService } from "../../application/services/presence-settings.service";
import { PresenceSettingsDto, UpdatePresenceSettingsDto } from "../dto/presence-settings.dto";

/** Присутствие по правилам клуба: часовой пояс, авто-выход забытых визитов, потолок длительности. */
@ApiTags("CRM Presence Settings")
@Controller("crm/settings/presence")
@CrmAuth()
export class CrmPresenceSettingsController {
    constructor(private readonly settings: PresenceSettingsService) {}

    @Get()
    @ApiOperation({ summary: "Правила присутствия клуба (сохранённые или по умолчанию)" })
    @ApiSuccessResponse(PresenceSettingsDto)
    @ApiErrorResponse([401, 403])
    async get(@PortalId() portalId: string): Promise<PresenceSettingsDto> {
        return this.settings.get(portalId);
    }

    @Patch()
    @RequirePermission(PERMISSIONS.SettingsClub)
    @ApiOperation({ summary: "Изменить правила присутствия; не названные поля остаются" })
    @ApiSuccessResponse(PresenceSettingsDto)
    @ApiErrorResponse([400, 401, 403])
    async update(
        @PortalId() portalId: string,
        @Body() dto: UpdatePresenceSettingsDto
    ): Promise<PresenceSettingsDto> {
        return this.settings.update(portalId, dto);
    }
}
