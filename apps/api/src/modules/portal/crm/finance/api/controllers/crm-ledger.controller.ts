import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { IdempotencyScope, Idempotent } from "@common/idempotency";
import type { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { LedgerEntriesService } from "../../application/services/ledger-entries.service";
import { CancelEntryUseCase } from "../../application/use-cases/cancel-entry.use-case";
import { CorrectEntryUseCase } from "../../application/use-cases/correct-entry.use-case";
import { ReclassifyEntryUseCase } from "../../application/use-cases/reclassify-entry.use-case";
import { RecordEntryUseCase } from "../../application/use-cases/record-entry.use-case";
import { CancelledEntryDto, LedgerEntryDto } from "../dto/ledger-entry.dto";
import { LedgerEntryInputDto, ReclassifyEntryDto } from "../dto/ledger-entry-input.dto";
import { LedgerListQueryDto } from "../dto/ledger-query.dto";
import { toLedgerEntryDto } from "../mappers/ledger.mapper";
import { toEntryInput } from "../mappers/ledger-input.mapper";

const DEFAULT_PAGE_SIZE = 25;

/** Реестр проводок (TASK-798): чтение — `finance.read`, запись и правка — `finance.write`. */
@ApiTags("CRM Finance")
@Controller("crm/finance/entries")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmLedgerController {
    constructor(
        private readonly entries: LedgerEntriesService,
        private readonly recordEntry: RecordEntryUseCase,
        private readonly correctEntry: CorrectEntryUseCase,
        private readonly reclassifyEntry: ReclassifyEntryUseCase,
        private readonly cancelEntry: CancelEntryUseCase
    ) {}

    @Get()
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({
        summary: "Проводки: новые сверху; фильтр по периоду, статье, счёту, контрагенту",
    })
    @ApiPaginatedResponse(LedgerEntryDto)
    @ApiErrorResponse([400, 401, 403])
    async list(
        @PortalId() portalId: string,
        @Query() query: LedgerListQueryDto
    ): Promise<PaginatedResult<LedgerEntryDto>> {
        const { page = 1, limit = DEFAULT_PAGE_SIZE, includeVoid, ...filter } = query;
        const { items, total } = await this.entries.list(
            portalId,
            { ...filter, includeVoid: includeVoid ?? false },
            { skip: PaginationUtil.getSkip(page, limit), take: limit }
        );
        return PaginationUtil.createPaginatedResult(
            items.map(toLedgerEntryDto),
            total,
            page,
            limit
        );
    }

    @Get(":id")
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({ summary: "Проводка: суммы по ставкам, документ, вложение, что можно менять" })
    @ApiSuccessResponse(LedgerEntryDto)
    @ApiErrorResponse([401, 403, 404])
    async get(@PortalId() portalId: string, @Param("id") id: string): Promise<LedgerEntryDto> {
        return toLedgerEntryDto(await this.entries.get(portalId, id));
    }

    @Post()
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @Idempotent(IdempotencyScope.CRM_FINANCE_ENTRY_CREATE)
    @ApiOperation({
        summary: "Доход, расход или перевод между счетами",
        description:
            "409 duplicate_document — у контрагента уже есть документ с этим номером (повторить " +
            "с allowDuplicate); 409 period_closed — месяц закрыт",
    })
    @ApiSuccessResponse(LedgerEntryDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 409])
    async create(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Body() dto: LedgerEntryInputDto
    ): Promise<LedgerEntryDto> {
        const entry = await this.recordEntry.execute(
            portalId,
            principal.membershipId,
            toEntryInput(dto),
            dto.allowDuplicate ?? false
        );
        return toLedgerEntryDto(entry);
    }

    @Put(":id")
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({ summary: "Исправить ручную проводку открытого месяца целиком" })
    @ApiSuccessResponse(LedgerEntryDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async correct(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string,
        @Body() dto: LedgerEntryInputDto
    ): Promise<LedgerEntryDto> {
        const entry = await this.correctEntry.execute(
            portalId,
            principal.membershipId,
            id,
            toEntryInput(dto),
            dto.allowDuplicate ?? false
        );
        return toLedgerEntryDto(entry);
    }

    @Patch(":id")
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({ summary: "Разметка без сумм: статья, счёт, заметки (и у проводки заказа)" })
    @ApiSuccessResponse(LedgerEntryDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async reclassify(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string,
        @Body() dto: ReclassifyEntryDto
    ): Promise<LedgerEntryDto> {
        return toLedgerEntryDto(
            await this.reclassifyEntry.execute(portalId, principal.membershipId, id, dto)
        );
    }

    @Post(":id/cancel")
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({
        summary: "Отменить проводку",
        description: "Открытый месяц — отмена; закрытый — сторно сегодняшним числом",
    })
    @ApiSuccessResponse(CancelledEntryDto, { status: 201 })
    @ApiErrorResponse([401, 403, 404, 409])
    async cancel(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string
    ): Promise<CancelledEntryDto> {
        const result = await this.cancelEntry.execute(portalId, principal.membershipId, id);
        return { mode: result.mode, entry: toLedgerEntryDto(result.entry) };
    }
}
