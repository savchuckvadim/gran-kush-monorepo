import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { FormPurpose, Prisma } from "@prisma/client";

import { ContentLocale } from "@common/i18n";
import { PrismaService } from "@common/prisma/prisma.service";
import { DynamicPayloadValidatorService } from "@modules/portal/crm/entity-fields/application/services/dynamic-payload-validator.service";
import { FieldValuesService } from "@modules/portal/crm/entity-fields/application/services/field-values.service";
import type { EntityListFilter } from "@modules/portal/crm/entity-fields/domain/entity-filter";
import {
    EntityRecordFilterBuilder,
    recordTextContains,
    searchWords,
} from "@modules/portal/crm/entity-fields/infrastructure/entity-record-filter.builder";
import {
    type EntityRecordView,
    toEntityRecordView,
} from "@modules/portal/crm/records/application/mappers/entity-record-view.mapper";
import { ENTITY_RECORD_INCLUDE } from "@modules/portal/crm/records/infrastructure/prisma-includes/entity-record.include";

import { RecordRelationsService } from "./record-relations.service";

export interface EntityRecordListFilters extends EntityListFilter {
    stageId?: string;
    statusItemId?: string;
    isActive?: boolean;
}

/** Универсальный CRUD записей произвольных EntityDefinition (смарт-процессы). */
@Injectable()
export class EntityRecordsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly validator: DynamicPayloadValidatorService,
        private readonly fieldValues: FieldValuesService,
        private readonly recordFilter: EntityRecordFilterBuilder,
        private readonly relations: RecordRelationsService
    ) {}

    private async getDefinition(portalId: string, code: string) {
        const def = await this.prisma.entityDefinition.findUnique({
            where: { portalId_code: { portalId, code } },
        });
        if (!def || !def.isActive) {
            throw new NotFoundException(`Entity "${code}" not found`);
        }
        return def;
    }

    private assertMutable(def: { isSystem: boolean; code: string }): void {
        if (def.isSystem) {
            throw new ForbiddenException(
                `System entity "${def.code}" records are managed via its dedicated API`
            );
        }
    }

    async list(
        portalId: string,
        code: string,
        limit: number,
        skip: number,
        filters: EntityRecordListFilters,
        locale: ContentLocale
    ): Promise<{ items: EntityRecordView[]; total: number }> {
        const def = await this.getDefinition(portalId, code);

        const where: Prisma.EntityRecordWhereInput = {
            portalId,
            entityDefinitionId: def.id,
        };
        if (filters.stageId) where.stageId = filters.stageId;
        if (filters.statusItemId) where.statusItemId = filters.statusItemId;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;

        const and = [
            ...searchWords(filters.q).map(recordTextContains),
            ...(await this.recordFilter.conditions(portalId, code, filters.conditions)),
        ];
        if (and.length > 0) {
            where.AND = and;
        }

        const [rows, total] = await Promise.all([
            this.prisma.entityRecord.findMany({
                where,
                take: limit,
                skip,
                orderBy: { createdAt: "desc" },
                include: ENTITY_RECORD_INCLUDE,
            }),
            this.prisma.entityRecord.count({ where }),
        ]);

        return { items: rows.map((r) => toEntityRecordView(code, r, locale)), total };
    }

    async getById(
        portalId: string,
        code: string,
        recordId: string,
        locale: ContentLocale
    ): Promise<EntityRecordView> {
        const def = await this.getDefinition(portalId, code);
        return this.fetchView(portalId, code, def.id, recordId, locale);
    }

    /** Полное представление записи, когда definition уже разрезолвлен. */
    private async fetchView(
        portalId: string,
        code: string,
        entityDefinitionId: string,
        recordId: string,
        locale: ContentLocale
    ): Promise<EntityRecordView> {
        const row = await this.prisma.entityRecord.findFirst({
            where: { id: recordId, portalId, entityDefinitionId },
            include: ENTITY_RECORD_INCLUDE,
        });
        if (!row) {
            throw new NotFoundException("Record not found");
        }
        return toEntityRecordView(code, row, locale);
    }

    private async getRecordOrThrow(
        portalId: string,
        entityDefinitionId: string,
        recordId: string
    ): Promise<void> {
        const row = await this.prisma.entityRecord.findFirst({
            where: { id: recordId, portalId, entityDefinitionId },
            select: { id: true },
        });
        if (!row) {
            throw new NotFoundException("Record not found");
        }
    }

    async create(
        portalId: string,
        code: string,
        fields: Record<string, unknown>,
        locale: ContentLocale,
        createdByEmployeeId?: string
    ): Promise<EntityRecordView> {
        const def = await this.getDefinition(portalId, code);
        this.assertMutable(def);

        const { plainFields, relationFields } = await this.relations.splitRelationFields(
            def.id,
            fields
        );
        const validated = await this.validator.validatePayload(
            portalId,
            code,
            FormPurpose.crm_create,
            plainFields
        );

        const stageId = await this.resolveDefaultStageId(portalId, def.id);
        const record = await this.prisma.$transaction(async (tx) => {
            const created = await tx.entityRecord.create({
                data: {
                    portalId,
                    entityDefinitionId: def.id,
                    stageId,
                    createdByEmployeeId: createdByEmployeeId ?? null,
                },
            });
            await this.fieldValues.upsertRecordFieldValues(
                portalId,
                code,
                created.id,
                validated,
                tx
            );
            await this.relations.replaceRelations(portalId, created.id, relationFields, tx);
            return created;
        });

        return this.fetchView(portalId, code, def.id, record.id, locale);
    }

    async update(
        portalId: string,
        code: string,
        recordId: string,
        input: { fields?: Record<string, unknown>; isActive?: boolean },
        locale: ContentLocale
    ): Promise<EntityRecordView> {
        const def = await this.getDefinition(portalId, code);
        this.assertMutable(def);
        await this.getRecordOrThrow(portalId, def.id, recordId);

        if (input.fields && Object.keys(input.fields).length > 0) {
            const { plainFields, relationFields } = await this.relations.splitRelationFields(
                def.id,
                input.fields
            );
            const validated = await this.validator.validatePartialUpdate(
                portalId,
                code,
                plainFields
            );
            await this.prisma.$transaction(async (tx) => {
                await this.fieldValues.upsertRecordFieldValues(
                    portalId,
                    code,
                    recordId,
                    validated,
                    tx
                );
                await this.relations.replaceRelations(portalId, recordId, relationFields, tx);
            });
        }

        if (input.isActive !== undefined) {
            await this.prisma.entityRecord.update({
                where: { id: recordId },
                data: { isActive: input.isActive },
            });
        }

        return this.fetchView(portalId, code, def.id, recordId, locale);
    }

    async delete(portalId: string, code: string, recordId: string): Promise<void> {
        const def = await this.getDefinition(portalId, code);
        this.assertMutable(def);
        await this.getRecordOrThrow(portalId, def.id, recordId);
        await this.prisma.entityRecord.delete({ where: { id: recordId } });
    }

    async setStage(
        portalId: string,
        code: string,
        recordId: string,
        stageId: string | null,
        locale: ContentLocale
    ): Promise<EntityRecordView> {
        const def = await this.getDefinition(portalId, code);
        await this.getRecordOrThrow(portalId, def.id, recordId);
        if (stageId) {
            const stage = await this.prisma.stage.findFirst({
                where: {
                    id: stageId,
                    stageCategory: { portalId, entityDefinitionId: def.id },
                },
                select: { id: true },
            });
            if (!stage) {
                throw new BadRequestException("Stage does not belong to this entity");
            }
        }
        await this.prisma.entityRecord.update({
            where: { id: recordId },
            data: { stageId },
        });
        return this.fetchView(portalId, code, def.id, recordId, locale);
    }

    async setStatus(
        portalId: string,
        code: string,
        recordId: string,
        statusItemId: string | null,
        locale: ContentLocale
    ): Promise<EntityRecordView> {
        const def = await this.getDefinition(portalId, code);
        await this.getRecordOrThrow(portalId, def.id, recordId);
        if (statusItemId) {
            const item = await this.prisma.statusItem.findFirst({
                where: {
                    id: statusItemId,
                    statusSet: { portalId, entityDefinitionId: def.id },
                },
                select: { id: true },
            });
            if (!item) {
                throw new BadRequestException("Status item does not belong to this entity");
            }
        }
        await this.prisma.entityRecord.update({
            where: { id: recordId },
            data: { statusItemId },
        });
        return this.fetchView(portalId, code, def.id, recordId, locale);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private async resolveDefaultStageId(
        portalId: string,
        entityDefinitionId: string
    ): Promise<string | null> {
        const stage = await this.prisma.stage.findFirst({
            where: {
                stageCategory: { portalId, entityDefinitionId, isDefault: true },
            },
            orderBy: { sortOrder: "asc" },
            select: { id: true },
        });
        return stage?.id ?? null;
    }
}
