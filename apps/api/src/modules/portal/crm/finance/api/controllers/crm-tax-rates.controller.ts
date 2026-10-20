import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Put,
    Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { TaxRatesService } from "../../application/services/tax-rates.service";
import type { TaxRate } from "../../domain/tax/tax-rate";
import {
    CreateTaxRateDto,
    TaxRateDto,
    TaxRateListQueryDto,
    UpdateTaxRateDto,
} from "../dto/tax-rate.dto";

const toDto = (rate: TaxRate): TaxRateDto => ({
    id: rate.id,
    presetCode: rate.presetCode,
    name: rate.name,
    percent: rate.percent,
    treatment: rate.treatment,
    isDefault: rate.isDefault,
    archivedAt: rate.archivedAt?.toISOString() ?? null,
});

/**
 * Ставки налога клуба. Список нужен всем, кто ведёт товары и заказы, поэтому без отдельного права;
 * менять ставки — `finance.admin`.
 */
@ApiTags("CRM Finance")
@Controller("crm/finance/tax-rates")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmTaxRatesController {
    constructor(private readonly taxRates: TaxRatesService) {}

    @Get()
    @ApiOperation({ summary: "Ставки налога клуба: сначала пресет, потом свои" })
    @ApiSuccessResponse(TaxRateDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async list(
        @PortalId() portalId: string,
        @Query() query: TaxRateListQueryDto
    ): Promise<TaxRateDto[]> {
        return (await this.taxRates.list(portalId, query.includeArchived ?? false)).map(toDto);
    }

    @Post()
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({ summary: "Своя ставка (finance.admin); у exempt и not_subject процент 0" })
    @ApiSuccessResponse(TaxRateDto)
    @ApiErrorResponse([400, 401, 403])
    async create(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Body() dto: CreateTaxRateDto
    ): Promise<TaxRateDto> {
        return toDto(await this.taxRates.create(portalId, dto, principal.membershipId));
    }

    @Patch(":id")
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({ summary: "Изменить ставку: подпись, процент, режим (finance.admin)" })
    @ApiSuccessResponse(TaxRateDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async update(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string,
        @Body() dto: UpdateTaxRateDto
    ): Promise<TaxRateDto> {
        return toDto(await this.taxRates.update(portalId, id, dto, principal.membershipId));
    }

    @Put(":id/default")
    @HttpCode(204)
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({
        summary: "Сделать ставкой по умолчанию: ею облагаются товары без своей ставки",
    })
    @ApiErrorResponse([400, 401, 403, 404])
    async makeDefault(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string
    ): Promise<void> {
        await this.taxRates.makeDefault(portalId, id, principal.membershipId);
    }

    @Delete(":id")
    @HttpCode(204)
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({
        summary: "В архив (finance.admin)",
        description:
            "409 tax_rate_is_default — ставка по умолчанию; 409 tax_rate_in_use — у товаров",
    })
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async archive(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string
    ): Promise<void> {
        await this.taxRates.archive(portalId, id, principal.membershipId);
    }
}
