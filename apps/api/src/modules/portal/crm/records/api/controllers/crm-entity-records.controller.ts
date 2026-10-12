import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import type { PortalPrincipal } from "@common/portal";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees";
import {
    RequireAdmin,
    RequireManager,
} from "@modules/portal/auth/employees/api/decorators/require-employee-jwt.decorator";

import { EntityRecordsService } from "../../application/services/entity-records.service";
import {
    CreateEntityRecordDto,
    DeleteRecordResponseDto,
    EntityRecordDto,
    EntityRecordListQueryDto,
    EntityRecordListResponseDto,
    SetRecordStageDto,
    SetRecordStatusDto,
    UpdateEntityRecordDto,
} from "../dto/entity-record.dto";

/**
 * Универсальный CRUD записей произвольных сущностей (смарт-процессы).
 * Системные сущности (member/employee/order/product) здесь read-only.
 * Фильтры: `q` (текст) и `filter` (JSON-массив условий по полям).
 */
@ApiTags("CRM Entity Records (smart processes)")
@Controller("crm/entities/:code/records")
@RequireEmployeeJwt()
export class CrmEntityRecordsController {
    constructor(private readonly recordsService: EntityRecordsService) {}

    @Get()
    @ApiOperation({ summary: "Список записей сущности (пагинация, поиск, условия по полям)" })
    @ApiSuccessResponse(EntityRecordListResponseDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async list(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @RequestLocale() locale: ContentLocale,
        @Query() query: EntityRecordListQueryDto
    ): Promise<EntityRecordListResponseDto> {
        const { limit = 50, skip = 0, stageId, statusItemId, q, filter } = query;
        return this.recordsService.list(
            portalId,
            code,
            limit,
            skip,
            { stageId, statusItemId, q, conditions: filter },
            locale
        );
    }

    @Post()
    @RequireManager()
    @ApiOperation({ summary: "Создать запись (валидация по форме crm_create). Роль: manager+" })
    @ApiSuccessResponse(EntityRecordDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async create(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Body() dto: CreateEntityRecordDto,
        @CurrentPrincipal() principal: PortalPrincipal,
        @RequestLocale() locale: ContentLocale
    ): Promise<EntityRecordDto> {
        return this.recordsService.create(
            portalId,
            code,
            dto.fields,
            locale,
            principal.membershipId
        );
    }

    @Get(":id")
    @ApiOperation({ summary: "Запись по id" })
    @ApiSuccessResponse(EntityRecordDto)
    @ApiErrorResponse([401, 403, 404])
    async byId(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string,
        @RequestLocale() locale: ContentLocale
    ): Promise<EntityRecordDto> {
        return this.recordsService.getById(portalId, code, id, locale);
    }

    @Patch(":id")
    @RequireManager()
    @ApiOperation({ summary: "Обновить поля/активность записи. Роль: manager+" })
    @ApiSuccessResponse(EntityRecordDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async update(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string,
        @Body() dto: UpdateEntityRecordDto,
        @RequestLocale() locale: ContentLocale
    ): Promise<EntityRecordDto> {
        return this.recordsService.update(portalId, code, id, dto, locale);
    }

    @Delete(":id")
    @RequireAdmin()
    @ApiOperation({ summary: "Удалить запись. Роль: admin/portal_owner" })
    @ApiSuccessResponse(DeleteRecordResponseDto)
    @ApiErrorResponse([401, 403, 404])
    async remove(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string
    ): Promise<DeleteRecordResponseDto> {
        await this.recordsService.delete(portalId, code, id);
        return { deleted: true };
    }

    @Patch(":id/stage")
    @RequireManager()
    @ApiOperation({ summary: "Сменить стадию записи (kanban). Роль: manager+" })
    @ApiSuccessResponse(EntityRecordDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async setStage(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string,
        @Body() dto: SetRecordStageDto,
        @RequestLocale() locale: ContentLocale
    ): Promise<EntityRecordDto> {
        return this.recordsService.setStage(portalId, code, id, dto.stageId, locale);
    }

    @Patch(":id/status")
    @RequireManager()
    @ApiOperation({ summary: "Сменить статус записи. Роль: manager+" })
    @ApiSuccessResponse(EntityRecordDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async setStatus(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string,
        @Body() dto: SetRecordStatusDto,
        @RequestLocale() locale: ContentLocale
    ): Promise<EntityRecordDto> {
        return this.recordsService.setStatus(portalId, code, id, dto.statusItemId, locale);
    }
}
