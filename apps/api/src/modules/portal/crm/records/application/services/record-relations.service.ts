import { BadRequestException, Injectable } from "@nestjs/common";

import { PortalFieldType, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

export type RelationFieldsMap = Map<
    string,
    {
        fieldDefinitionId: string;
        targetEntityDefinitionId: string | null;
        targetIds: string[];
    }
>;

/**
 * Поля-связи записи (type=relation): живут не в значениях полей, а в RecordRelation с проверкой,
 * что цель существует в этом клубе и нужной сущности.
 */
@Injectable()
export class RecordRelationsService {
    constructor(private readonly prisma: PrismaService) {}

    /** Делит пришедшие поля на обычные и связи (id цели или массив id). */
    async splitRelationFields(
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

    /** Заменяет связи записи по каждому пришедшему полю; несуществующая цель — 400. */
    async replaceRelations(
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
}
