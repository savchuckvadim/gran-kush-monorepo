import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
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
    CounterpartiesService,
    type CounterpartyInput,
    type CounterpartyView,
} from "../../application/services/counterparties.service";
import {
    CounterpartyDto,
    CounterpartyInputDto,
    CounterpartyListQueryDto,
} from "../dto/counterparty.dto";

const toDto = (view: CounterpartyView): CounterpartyDto => ({
    id: view.id,
    kind: view.kind,
    memberId: view.memberId,
    name: view.name,
    nif: view.nif,
    country: view.country,
    notes: view.notes,
    entryCount: view.entryCount,
    archivedAt: view.archivedAt?.toISOString() ?? null,
});

const toInput = (dto: CounterpartyInputDto): CounterpartyInput => ({
    kind: dto.kind,
    name: dto.name,
    nif: dto.nif ?? null,
    country: dto.country ?? null,
    notes: dto.notes ?? null,
});

/** Контрагенты: имя и NIF хранятся шифром, номер в клубе — один на контрагента. */
@ApiTags("CRM Finance")
@Controller("crm/finance/counterparties")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmCounterpartiesController {
    constructor(private readonly counterparties: CounterpartiesService) {}

    @Get()
    @RequirePermission(PERMISSIONS.FinanceRead)
    @ApiOperation({ summary: "Поставщики, клиенты, госорганы и участники-контрагенты" })
    @ApiSuccessResponse(CounterpartyDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async list(
        @PortalId() portalId: string,
        @Query() query: CounterpartyListQueryDto
    ): Promise<CounterpartyDto[]> {
        return (await this.counterparties.list(portalId, query.includeArchived ?? false)).map(
            toDto
        );
    }

    @Post()
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({
        summary: "Новый контрагент",
        description:
            "400 counterparty_nif_invalid; 409 counterparty_nif_taken — номер уже у другого",
    })
    @ApiSuccessResponse(CounterpartyDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 409])
    async create(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Body() dto: CounterpartyInputDto
    ): Promise<CounterpartyDto> {
        return toDto(
            await this.counterparties.create(portalId, toInput(dto), principal.membershipId)
        );
    }

    @Put(":id")
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({ summary: "Изменить контрагента (участника меняют в его карточке)" })
    @ApiSuccessResponse(CounterpartyDto)
    @ApiErrorResponse([400, 401, 403, 404, 409])
    async update(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string,
        @Body() dto: CounterpartyInputDto
    ): Promise<CounterpartyDto> {
        return toDto(
            await this.counterparties.update(portalId, id, toInput(dto), principal.membershipId)
        );
    }

    @Delete(":id")
    @HttpCode(204)
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({ summary: "В архив: проводки остаются, в новых его не выбрать" })
    @ApiErrorResponse([401, 403, 404])
    async archive(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string
    ): Promise<void> {
        await this.counterparties.archive(portalId, id, principal.membershipId);
    }
}
