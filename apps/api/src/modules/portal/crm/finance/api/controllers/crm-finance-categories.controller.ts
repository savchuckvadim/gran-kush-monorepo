import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { FinanceCategoriesService } from "../../application/services/finance-categories.service";
import type { FinanceCategory } from "../../domain/ledger/finance-category";
import {
    CreateFinanceCategoryDto,
    FinanceCategoryDto,
    FinanceCategoryListQueryDto,
    UpdateFinanceCategoryDto,
} from "../dto/finance-category.dto";

const toDto = (category: FinanceCategory): FinanceCategoryDto => ({
    id: category.id,
    code: category.code,
    name: category.name,
    direction: category.direction,
    pgcAccount: category.pgcAccount,
    taxTreatment: category.taxTreatment,
    isPreset: category.isPreset,
    archivedAt: category.archivedAt?.toISOString() ?? null,
});

/** Статьи доходов и расходов: видит `finance.read`, настраивает `finance.admin`. */
@ApiTags("CRM Finance")
@Controller("crm/finance/categories")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmFinanceCategoriesController {
    constructor(private readonly categories: FinanceCategoriesService) {}

    @Get()
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({ summary: "Статьи клуба: доходы, затем расходы; пресет первым" })
    @ApiSuccessResponse(FinanceCategoryDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async list(
        @PortalId() portalId: string,
        @Query() query: FinanceCategoryListQueryDto
    ): Promise<FinanceCategoryDto[]> {
        return (await this.categories.list(portalId, query.includeArchived ?? false)).map(toDto);
    }

    @Post()
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({ summary: "Своя статья; код для импорта собирается из названия" })
    @ApiSuccessResponse(FinanceCategoryDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 409])
    async create(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Body() dto: CreateFinanceCategoryDto
    ): Promise<FinanceCategoryDto> {
        const category = await this.categories.create(
            portalId,
            {
                name: dto.name,
                direction: dto.direction,
                pgcAccount: dto.pgcAccount ?? null,
                taxTreatment: dto.taxTreatment ?? null,
            },
            principal.membershipId
        );
        return toDto(category);
    }

    @Patch(":id")
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({ summary: "Переименовать статью, счёт PGC, налог по умолчанию" })
    @ApiSuccessResponse(FinanceCategoryDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async update(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string,
        @Body() dto: UpdateFinanceCategoryDto
    ): Promise<FinanceCategoryDto> {
        return toDto(await this.categories.update(portalId, id, dto, principal.membershipId));
    }

    @Delete(":id")
    @HttpCode(204)
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({
        summary: "В архив: новые проводки статью не выберут, старые остаются",
        description: "409 category_receives_orders — в статью идут оплаченные заказы",
    })
    @ApiErrorResponse([401, 403, 404, 409])
    async archive(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string
    ): Promise<void> {
        await this.categories.archive(portalId, id, principal.membershipId);
    }
}
