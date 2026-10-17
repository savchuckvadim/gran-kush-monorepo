import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    Param,
    Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type PortalPrincipal, principalCan } from "@common/portal";
import { CurrentEmployee } from "@modules/portal/auth/employees/api/decorators/current-employee.decorator";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import {
    SaveUiSettingDto,
    UiSettingDto,
} from "@modules/portal/crm/ui-settings/api/dto/ui-setting.dto";
import { UiSettingsService } from "@modules/portal/crm/ui-settings/application/services/ui-settings.service";
import type { UiSettingPair } from "@modules/portal/crm/ui-settings/domain/repositories/ui-setting-repository.interface";
import {
    isUiSettingKey,
    type UiSettingKey,
} from "@modules/portal/crm/ui-settings/domain/ui-setting-keys";

/** Значение хранится как JSON, но все настройки сейчас — списки ключей полей. */
const toStrings = (value: unknown): string[] | null =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : null;

const toDto = (pair: UiSettingPair): UiSettingDto => ({
    portal: toStrings(pair.portal),
    employee: toStrings(pair.employee),
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRM UI Settings Controller
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("CRM UI Settings")
@Controller("crm/settings/ui")
@CrmAuth()
@ApiBearerAuth()
export class CrmUiSettingsController {
    constructor(private readonly uiSettings: UiSettingsService) {}

    private parseKey(raw: string): UiSettingKey {
        if (!isUiSettingKey(raw)) {
            throw new BadRequestException(`Неизвестная настройка: "${raw}"`);
        }
        return raw;
    }

    // ─── Прочитать настройку ─────────────────────────────────────────────────

    @Get(":key")
    @ApiOperation({
        summary: "Настройка интерфейса: клубная и личная. Любой сотрудник клуба",
    })
    @ApiSuccessResponse(UiSettingDto)
    @ApiErrorResponse([400, 401, 403])
    async getSetting(
        @Param("key") key: string,
        @CurrentEmployee() employee: Employee,
        @PortalId() portalId: string
    ): Promise<UiSettingDto> {
        const pair = await this.uiSettings.get(portalId, employee.id, this.parseKey(key));
        return toDto(pair);
    }

    // ─── Сохранить настройку ─────────────────────────────────────────────────

    @Put(":key")
    @ApiOperation({
        summary:
            "Сохранить настройку: личную — любой сотрудник, клубную (`forPortal`) — с правом settings.views. " +
            "`value: null` сбрасывает её",
    })
    @ApiSuccessResponse(UiSettingDto)
    @ApiErrorResponse([400, 401, 403])
    async saveSetting(
        @Param("key") key: string,
        @Body() dto: SaveUiSettingDto,
        @CurrentEmployee() employee: Employee,
        @CurrentPrincipal() principal: PortalPrincipal,
        @PortalId() portalId: string
    ): Promise<UiSettingDto> {
        const forPortal = dto.forPortal ?? false;
        if (forPortal && !principalCan(principal, PERMISSIONS.SettingsViews)) {
            throw new ForbiddenException(
                "Менять общий для клуба вид может тот, у кого есть на это право"
            );
        }

        const pair = await this.uiSettings.save({
            portalId,
            employeeId: forPortal ? null : employee.id,
            key: this.parseKey(key),
            value: dto.value ?? null,
            actorEmployeeId: employee.id,
        });
        return toDto(pair);
    }
}
