import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import type {
    OrganizationIdentity,
    OrganizationTaxSettings,
} from "../../domain/organization/organization-profile";
import { OrganizationProfileService } from "../../application/services/organization-profile.service";
import {
    OrganizationProfileDto,
    UpdateOrganizationProfileDto,
} from "../dto/organization-profile.dto";

const toDto = (
    configured: boolean,
    profile: OrganizationTaxSettings & { identity: OrganizationIdentity; updatedAt: Date | null }
): OrganizationProfileDto => {
    const { identity, updatedAt, ...settings } = profile;
    return { configured, ...settings, ...identity, updatedAt: updatedAt?.toISOString() ?? null };
};

@ApiTags("CRM Finance")
@Controller("crm/finance/profile")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmFinanceProfileController {
    constructor(private readonly profiles: OrganizationProfileService) {}

    @Get()
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({
        summary: "Профиль организации: форма, налоги, реквизиты. До сохранения — пресет типа клуба",
    })
    @ApiSuccessResponse(OrganizationProfileDto)
    @ApiErrorResponse([401, 403])
    async get(@PortalId() portalId: string): Promise<OrganizationProfileDto> {
        const view = await this.profiles.get(portalId);
        return toDto(view.configured, view.profile);
    }

    @Put()
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({
        summary: "Сохранить профиль организации (finance.admin)",
        description:
            "Проверяет NIF/NIE/CIF по контрольному знаку и форме организации, IBAN — по mod 97. " +
            "Коды 400: invalid_tax_id, tax_id_kind_mismatch, invalid_iban, tax_regime_mismatch",
    })
    @ApiSuccessResponse(OrganizationProfileDto)
    @ApiErrorResponse([400, 401, 403])
    async save(
        @Body() dto: UpdateOrganizationProfileDto,
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<OrganizationProfileDto> {
        const { legalForm, vatRegime, incomeTaxRegime, pricesIncludeTax, fiscalYearStartMonth } =
            dto;
        const saved = await this.profiles.save(
            portalId,
            {
                legalForm,
                vatRegime,
                incomeTaxRegime,
                pricesIncludeTax,
                fiscalYearStartMonth,
                identity: {
                    legalName: dto.legalName,
                    tradeName: dto.tradeName ?? null,
                    taxId: dto.taxId ?? null,
                    addressLine: dto.addressLine ?? null,
                    postalCode: dto.postalCode ?? null,
                    city: dto.city ?? null,
                    province: dto.province ?? null,
                    iban: dto.iban ?? null,
                    email: dto.email ?? null,
                    phone: dto.phone ?? null,
                    gestorName: dto.gestorName ?? null,
                    gestorEmail: dto.gestorEmail ?? null,
                    gestorPhone: dto.gestorPhone ?? null,
                },
            },
            principal.membershipId
        );
        return toDto(true, saved);
    }
}
