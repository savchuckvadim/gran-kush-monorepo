import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { FormPurpose, PortalFieldType, Prisma } from "@prisma/client";

import { ContentLocale, resolveLabel } from "@common/i18n";
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
    ENTITY_RECORD_INCLUDE,
    EntityRecordWithRelations,
} from "@modules/portal/crm/records/infrastructure/prisma-includes/entity-record.include";

export interface EntityRecordListFilters extends EntityListFilter {
    stageId?: string;
    statusItemId?: string;
    isActive?: boolean;
}

type RelationFieldsMap = Map<
    string,
    {
        fieldDefinitionId: string;
        targetEntityDefinitionId: string | null;
        targetIds: string[];
    }
>;

export interface EntityRecordView {
    id: string;
    entityCode: string;
    isActive: boolean;
    stage: { id: string; name: string; color: string | null; semantic: string } | null;
    statusItem: { id: string; key: string; label: string; color: string | null } | null;
    fields: { fieldKey: string; type: string; label: string | null; value: unknown }[];
    relations: { fieldKey: string; targetRecordIds: string[] }[];
    createdAt: string;
    updatedAt: string;
}

/** Универсальный CRUD записей произвольных EntityDefinition (смарт-процессы). */
@Injectable()
export class EntityRecordsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly validator: DynamicPayloadValidatorService,
        private readonly fieldValues: FieldValuesService,
        private readonly recordFilter: EntityRecordFilterBuilder
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

        return { items: rows.map((r) => this.toView(code, r, locale)), total };
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
        return this.toView(code, row, locale);
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

        const { plainFields, relationFields } = await this.splitRelationFields(def.id, fields);
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
            await this.replaceRelations(portalId, created.id, relationFields, tx);
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
            const { plainFields, relationFields } = await this.splitRelationFields(
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
                await this.replaceRelations(portalId, recordId, relationFields, tx);
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

    // ─── Relations (type=relation → RecordRelation с referential integrity) ──

    private async splitRelationFields(
        entityDefinitionId: string,
        fields: Record<string, unknown>
    ): Promise<{
        plainFields: Record<string, unknown>;
        relationFields: RelationFieldsMap;
    }> {
        const keys = Object.keys(fields);
        const relationDefs =
            keys.length === 0
                ? []
                : await this.prisma.fieldDefinition.findMany({
                      where: {
                          entityDefinitionId,
                          fieldKey: { in: keys },
                          type: PortalFieldType.relation,
                      },
                      select: { id: true, fieldKey: true, relationTargetEntityDefinitionId: true },
                  });

        const relationByKey = new Map(relationDefs.map((d) => [d.fieldKey, d]));
        const plainFields: Record<string, unknown> = {};
        const relationFields: RelationFieldsMap = new Map();

        for (const [key, value] of Object.entries(fields)) {
            const relDef = relationByKey.get(key);
            if (!relDef) {
                plainFields[key] = value;
                continue;
            }
            const targetIds =
                value === null || value === undefined
                    ? []
                    : Array.isArray(value)
                      ? value.filter((v): v is string => typeof v === "string")
                      : typeof value === "string"
                        ? [value]
                        : [];
            relationFields.set(key, {
                fieldDefinitionId: relDef.id,
                targetEntityDefinitionId: relDef.relationTargetEntityDefinitionId,
                targetIds,
            });
        }

        return { plainFields, relationFields };
    }

    private async replaceRelations(
        portalId: string,
        sourceRecordId: string,
        relationFields: RelationFieldsMap,
        tx?: Prisma.TransactionClient
    ): Promise<void> {
        const db = tx ?? this.prisma;
        for (const [fieldKey, entry] of relationFields) {
            const { fieldDefinitionId, targetEntityDefinitionId, targetIds } = entry;

            if (targetIds.length > 0) {
                const found = await db.entityRecord.findMany({
                    where: {
                        id: { in: targetIds },
                        portalId,
                        ...(targetEntityDefinitionId
                            ? { entityDefinitionId: targetEntityDefinitionId }
                            : {}),
                    },
                    select: { id: true },
                });
                const foundIds = new Set(found.map((r) => r.id));
                const missing = targetIds.find((id) => !foundIds.has(id));
                if (missing) {
                    throw new BadRequestException(
                        `Relation "${fieldKey}": target record ${missing} not found`
                    );
                }
            }

            await db.recordRelation.deleteMany({
                where: { fieldDefinitionId, sourceRecordId },
            });
            if (targetIds.length > 0) {
                await db.recordRelation.createMany({
                    data: targetIds.map((targetRecordId, sortOrder) => ({
                        portalId,
                        fieldDefinitionId,
                        sourceRecordId,
                        targetRecordId,
                        sortOrder,
                    })),
                });
            }
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private toView(
        entityCode: string,
        row: EntityRecordWithRelations,
        locale: ContentLocale
    ): EntityRecordView {
        const byDef = new Map<
            string,
            { def: (typeof row.fieldValues)[0]["fieldDefinition"]; values: unknown[] }
        >();
        for (const fv of row.fieldValues) {
            let bucket = byDef.get(fv.fieldDefinitionId);
            if (!bucket) {
                bucket = { def: fv.fieldDefinition, values: [] };
                byDef.set(fv.fieldDefinitionId, bucket);
            }
            bucket.values.push(fv.valueJson);
        }

        const fields = [...byDef.values()]
            .sort((a, b) => a.def.sortOrder - b.def.sortOrder)
            .map(({ def, values }) => ({
                fieldKey: def.fieldKey,
                type: def.type,
                label: resolveLabel(def, locale),
                value: def.isMultiple ? values : (values[0] ?? null),
            }));

        const relationsByKey = new Map<string, string[]>();
        for (const rel of row.relationsAsSource) {
            const key = rel.fieldDefinition.fieldKey;
            const bucket = relationsByKey.get(key) ?? [];
            bucket.push(rel.targetRecordId);
            relationsByKey.set(key, bucket);
        }

        return {
            id: row.id,
            entityCode,
            isActive: row.isActive,
            stage: row.stage,
            statusItem: row.statusItem && {
                id: row.statusItem.id,
                key: row.statusItem.key,
                label: resolveLabel(row.statusItem, locale),
                color: row.statusItem.color,
            },
            fields,
            relations: [...relationsByKey.entries()].map(([fieldKey, targetRecordIds]) => ({
                fieldKey,
                targetRecordIds,
            })),
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }

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
