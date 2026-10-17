import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import { type PortalPrincipal, principalCan } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { entityReadPermission } from "@modules/portal/crm/access/domain/entity-read-permission";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

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
/** Записи системной сущности здесь читаются только с правом её раздела (участники, сотрудники, заказы). */
const assertCanReadEntity = (principal: PortalPrincipal, code: string): void => {
    const required = entityReadPermission(code);
    if (required && !principalCan(principal, required)) {
        throw new ForbiddenException({
            message: "Not enough permissions",
            code: "missing_permission",
            errors: [required],
        });
    }
};

@ApiTags("CRM Entity Records (smart processes)")
@Controller("crm/entities/:code/records")
@CrmAuth()
@RequirePermission(PERMISSIONS.RecordsRead)
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
        @Query() query: EntityRecordListQueryDto,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<EntityRecordListResponseDto> {
        assertCanReadEntity(principal, code);
        const {
            limit = 50,
            skip = 0,
            sortBy,
            stageId,
            stageCategoryId,
            statusItemId,
            q,
            filter,
        } = query;
        return this.recordsService.list(
            portalId,
            code,
            { limit, skip, sortBy },
            { stageId, stageCategoryId, statusItemId, q, conditions: filter },
            locale
        );
    }

    @Post()
    @RequirePermission(PERMISSIONS.RecordsWrite)
    @ApiOperation({
        summary: "Создать запись (валидация по форме crm_create). Право records.write",
    })
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
            { fields: dto.fields, stageId: dto.stageId },
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
        @RequestLocale() locale: ContentLocale,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<EntityRecordDto> {
        assertCanReadEntity(principal, code);
        return this.recordsService.getById(portalId, code, id, locale);
    }

    @Patch(":id")
    @RequirePermission(PERMISSIONS.RecordsWrite)
    @ApiOperation({ summary: "Обновить поля/активность записи. Право records.write" })
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
    @RequirePermission(PERMISSIONS.RecordsDelete)
    @ApiOperation({ summary: "Удалить запись (право records.delete)" })
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
    @RequirePermission(PERMISSIONS.RecordsWrite)
    @ApiOperation({
        summary:
            "Перенести карточку: стадия и место в колонке (afterId — сосед сверху). Право records.write",
    })
    @ApiSuccessResponse(EntityRecordDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async setStage(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string,
        @Body() dto: SetRecordStageDto,
        @RequestLocale() locale: ContentLocale
    ): Promise<EntityRecordDto> {
        return this.recordsService.setStage(
            portalId,
            code,
            id,
            { stageId: dto.stageId, afterId: dto.afterId },
            locale
        );
    }

    @Patch(":id/status")
    @RequirePermission(PERMISSIONS.RecordsWrite)
    @ApiOperation({ summary: "Сменить статус записи. Право records.write" })
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
