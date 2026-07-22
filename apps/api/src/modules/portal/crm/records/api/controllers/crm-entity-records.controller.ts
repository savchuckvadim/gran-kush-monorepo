import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import type { Request } from "express";
import { Req } from "@nestjs/common";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees";

import { EntityRecordsService } from "../../application/services/entity-records.service";
import {
    CreateEntityRecordDto,
    DeleteRecordResponseDto,
    EntityRecordDto,
    EntityRecordListResponseDto,
    SetRecordStageDto,
    SetRecordStatusDto,
    UpdateEntityRecordDto,
} from "../dto/entity-record.dto";

/**
 * Универсальный CRUD записей произвольных сущностей (смарт-процессы).
 * Системные сущности (member/employee/order/product) здесь read-only.
 * Фильтры по полям: ?fields[field_key]=value
 */
@ApiTags("CRM Entity Records (smart processes)")
@Controller("crm/entities/:code/records")
@RequireEmployeeJwt()
export class CrmEntityRecordsController {
    constructor(private readonly recordsService: EntityRecordsService) {}

    @Get()
    @ApiOperation({ summary: "Список записей сущности (пагинация, фильтры по FieldValue)" })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "skip", required: false, type: Number })
    @ApiQuery({ name: "stageId", required: false, type: String })
    @ApiQuery({ name: "statusItemId", required: false, type: String })
    @ApiSuccessResponse(EntityRecordListResponseDto)
    @ApiErrorResponse([401, 403, 404])
    async list(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Req() request: Request,
        @Query("limit") limitRaw?: string,
        @Query("skip") skipRaw?: string,
        @Query("stageId") stageId?: string,
        @Query("statusItemId") statusItemId?: string
    ): Promise<EntityRecordListResponseDto> {
        const limit = Math.min(Number.parseInt(limitRaw ?? "50", 10) || 50, 200);
        const skip = Number.parseInt(skipRaw ?? "0", 10) || 0;

        const rawFields = (request.query as Record<string, unknown>)["fields"];
        const fields: Record<string, string> = {};
        if (rawFields && typeof rawFields === "object" && !Array.isArray(rawFields)) {
            for (const [key, value] of Object.entries(rawFields as Record<string, unknown>)) {
                if (typeof value === "string") {
                    fields[key] = value;
                }
            }
        }

        return this.recordsService.list(portalId, code, limit, skip, {
            stageId,
            statusItemId,
            fields,
        });
    }

    @Post()
    @ApiOperation({ summary: "Создать запись (валидация по форме crm_create)" })
    @ApiSuccessResponse(EntityRecordDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async create(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Body() dto: CreateEntityRecordDto,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<EntityRecordDto> {
        return this.recordsService.create(portalId, code, dto.fields, principal.membershipId);
    }

    @Get(":id")
    @ApiOperation({ summary: "Запись по id" })
    @ApiSuccessResponse(EntityRecordDto)
    @ApiErrorResponse([401, 403, 404])
    async byId(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string
    ): Promise<EntityRecordDto> {
        return this.recordsService.getById(portalId, code, id);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Обновить поля/активность записи" })
    @ApiSuccessResponse(EntityRecordDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async update(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string,
        @Body() dto: UpdateEntityRecordDto
    ): Promise<EntityRecordDto> {
        return this.recordsService.update(portalId, code, id, dto);
    }

    @Delete(":id")
    @ApiOperation({ summary: "Удалить запись" })
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
    @ApiOperation({ summary: "Сменить стадию записи (kanban)" })
    @ApiSuccessResponse(EntityRecordDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async setStage(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string,
        @Body() dto: SetRecordStageDto
    ): Promise<EntityRecordDto> {
        return this.recordsService.setStage(portalId, code, id, dto.stageId);
    }

    @Patch(":id/status")
    @ApiOperation({ summary: "Сменить статус записи" })
    @ApiSuccessResponse(EntityRecordDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async setStatus(
        @PortalId() portalId: string,
        @Param("code") code: string,
        @Param("id") id: string,
        @Body() dto: SetRecordStatusDto
    ): Promise<EntityRecordDto> {
        return this.recordsService.setStatus(portalId, code, id, dto.statusItemId);
    }
}
