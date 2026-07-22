import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { FormPurpose, PortalFieldType, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DynamicPayloadValidatorService } from "@modules/portal/crm/entity-fields/application/services/dynamic-payload-validator.service";
import { FieldValuesService } from "@modules/portal/crm/entity-fields/application/services/field-values.service";
import {
    ENTITY_RECORD_INCLUDE,
    EntityRecordWithRelations,
} from "@modules/portal/crm/records/infrastructure/prisma-includes/entity-record.include";

export interface EntityRecordListFilters {
    stageId?: string;
    statusItemId?: string;
    isActive?: boolean;
    /** fieldKey → точное значение (JSON equals) */
    fields?: Record<string, string>;
}

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
        private readonly fieldValues: FieldValuesService
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
        filters: EntityRecordListFilters
    ): Promise<{ items: EntityRecordView[]; total: number }> {
        const def = await this.getDefinition(portalId, code);

        const where: Prisma.EntityRecordWhereInput = {
            portalId,
            entityDefinitionId: def.id,
        };
        if (filters.stageId) where.stageId = filters.stageId;
        if (filters.statusItemId) where.statusItemId = filters.statusItemId;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;

        if (filters.fields && Object.keys(filters.fields).length > 0) {
            const fieldFilters: Prisma.EntityRecordWhereInput[] = [];
            for (const [fieldKey, rawValue] of Object.entries(filters.fields)) {
                const fieldDef = await this.prisma.fieldDefinition.findUnique({
                    where: {
                        entityDefinitionId_fieldKey: { entityDefinitionId: def.id, fieldKey },
                    },
                    select: { id: true },
                });
                if (!fieldDef) {
                    continue;
                }
                fieldFilters.push({
                    fieldValues: {
                        some: {
                            fieldDefinitionId: fieldDef.id,
                            valueJson: { equals: this.parseFilterValue(rawValue) },
                        },
                    },
                });
            }
            if (fieldFilters.length > 0) {
                where.AND = fieldFilters;
            }
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

        return { items: rows.map((r) => this.toView(code, r)), total };
    }

    async getById(portalId: string, code: string, recordId: string): Promise<EntityRecordView> {
        const def = await this.getDefinition(portalId, code);
        const row = await this.prisma.entityRecord.findFirst({
            where: { id: recordId, portalId, entityDefinitionId: def.id },
            include: ENTITY_RECORD_INCLUDE,
        });
        if (!row) {
            throw new NotFoundException("Record not found");
        }
        return this.toView(code, row);
    }

    async create(
        portalId: string,
        code: string,
        fields: Record<string, unknown>,
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

        const record = await this.prisma.entityRecord.create({
            data: {
                portalId,
                entityDefinitionId: def.id,
                stageId: await this.resolveDefaultStageId(portalId, def.id),
                createdByEmployeeId: createdByEmployeeId ?? null,
            },
        });

        await this.fieldValues.upsertRecordFieldValues(portalId, code, record.id, validated);
        await this.replaceRelations(portalId, def.id, record.id, relationFields);

        return this.getById(portalId, code, record.id);
    }

    async update(
        portalId: string,
        code: string,
        recordId: string,
        input: { fields?: Record<string, unknown>; isActive?: boolean }
    ): Promise<EntityRecordView> {
        const def = await this.getDefinition(portalId, code);
        this.assertMutable(def);
        await this.getById(portalId, code, recordId);

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
            await this.fieldValues.upsertRecordFieldValues(portalId, code, recordId, validated);
            await this.replaceRelations(portalId, def.id, recordId, relationFields);
        }

        if (input.isActive !== undefined) {
            await this.prisma.entityRecord.update({
                where: { id: recordId },
                data: { isActive: input.isActive },
            });
        }

        return this.getById(portalId, code, recordId);
    }

    async delete(portalId: string, code: string, recordId: string): Promise<void> {
        const def = await this.getDefinition(portalId, code);
        this.assertMutable(def);
        const row = await this.prisma.entityRecord.findFirst({
            where: { id: recordId, portalId, entityDefinitionId: def.id },
            select: { id: true },
        });
        if (!row) {
            throw new NotFoundException("Record not found");
        }
        await this.prisma.entityRecord.delete({ where: { id: recordId } });
    }

    async setStage(
        portalId: string,
        code: string,
        recordId: string,
        stageId: string | null
    ): Promise<EntityRecordView> {
        const def = await this.getDefinition(portalId, code);
        const row = await this.prisma.entityRecord.findFirst({
            where: { id: recordId, portalId, entityDefinitionId: def.id },
            select: { id: true },
        });
        if (!row) {
            throw new NotFoundException("Record not found");
        }
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
        return this.getById(portalId, code, recordId);
    }

    async setStatus(
        portalId: string,
        code: string,
        recordId: string,
        statusItemId: string | null
    ): Promise<EntityRecordView> {
        const def = await this.getDefinition(portalId, code);
        const row = await this.prisma.entityRecord.findFirst({
            where: { id: recordId, portalId, entityDefinitionId: def.id },
            select: { id: true },
        });
        if (!row) {
            throw new NotFoundException("Record not found");
        }
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
        return this.getById(portalId, code, recordId);
    }

    // ─── Relations (type=relation → RecordRelation с referential integrity) ──

    private async splitRelationFields(
        entityDefinitionId: string,
        fields: Record<string, unknown>
    ): Promise<{
        plainFields: Record<string, unknown>;
        relationFields: Map<string, { fieldDefinitionId: string; targetIds: string[] }>;
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
        const relationFields = new Map<
            string,
            { fieldDefinitionId: string; targetIds: string[] }
        >();

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
            relationFields.set(key, { fieldDefinitionId: relDef.id, targetIds });
        }

        return { plainFields, relationFields };
    }

    private async replaceRelations(
        portalId: string,
        entityDefinitionId: string,
        sourceRecordId: string,
        relationFields: Map<string, { fieldDefinitionId: string; targetIds: string[] }>
    ): Promise<void> {
        for (const [fieldKey, { fieldDefinitionId, targetIds }] of relationFields) {
            const def = await this.prisma.fieldDefinition.findUnique({
                where: { id: fieldDefinitionId },
                select: { relationTargetEntityDefinitionId: true },
            });

            for (const targetId of targetIds) {
                const target = await this.prisma.entityRecord.findFirst({
                    where: {
                        id: targetId,
                        portalId,
                        ...(def?.relationTargetEntityDefinitionId
                            ? { entityDefinitionId: def.relationTargetEntityDefinitionId }
                            : {}),
                    },
                    select: { id: true },
                });
                if (!target) {
                    throw new BadRequestException(
                        `Relation "${fieldKey}": target record ${targetId} not found`
                    );
                }
            }

            await this.prisma.recordRelation.deleteMany({
                where: { fieldDefinitionId, sourceRecordId },
            });
            let sortOrder = 0;
            for (const targetId of targetIds) {
                await this.prisma.recordRelation.create({
                    data: {
                        portalId,
                        fieldDefinitionId,
                        sourceRecordId,
                        targetRecordId: targetId,
                        sortOrder: sortOrder++,
                    },
                });
            }
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private toView(entityCode: string, row: EntityRecordWithRelations): EntityRecordView {
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
                label: def.labelOverride ?? def.label,
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
            statusItem: row.statusItem,
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

    private parseFilterValue(raw: string): Prisma.InputJsonValue {
        const trimmed = raw.trim();
        if (trimmed === "true") return true;
        if (trimmed === "false") return false;
        const num = Number(trimmed);
        if (trimmed !== "" && !Number.isNaN(num) && String(num) === trimmed) {
            return num;
        }
        return trimmed;
    }
}
