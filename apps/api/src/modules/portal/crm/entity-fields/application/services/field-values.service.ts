import { Injectable, NotFoundException } from "@nestjs/common";

import { PortalFieldType, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FieldValuesService {
    constructor(private readonly prisma: PrismaService) {}

    toJson(value: unknown): Prisma.InputJsonValue {
        if (value === null || value === undefined) {
            return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
        }
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return value;
        }
        if (Array.isArray(value)) {
            return value as Prisma.InputJsonValue;
        }
        return value as Prisma.InputJsonValue;
    }

    private async resolveMemberEntityRecordId(memberId: string, db: Tx): Promise<string> {
        const member = await db.member.findUnique({
            where: { id: memberId },
            select: { entityRecordId: true },
        });
        if (!member) {
            throw new NotFoundException(`Member ${memberId} not found`);
        }
        return member.entityRecordId;
    }

    async upsertMemberFieldValues(
        portalId: string,
        memberId: string,
        values: Record<string, unknown>,
        tx?: Tx
    ): Promise<void> {
        const db = tx ?? this.prisma;
        const entityRecordId = await this.resolveMemberEntityRecordId(memberId, db);
        await this.upsertRecordFieldValues(
            portalId,
            ENTITY_DEFINITION_CODES.MEMBER,
            entityRecordId,
            values,
            db
        );
    }

    /** Универсальный upsert значений для любой EntityRecord по коду сущности. */
    async upsertRecordFieldValues(
        portalId: string,
        entityCode: string,
        entityRecordId: string,
        values: Record<string, unknown>,
        tx?: Tx
    ): Promise<void> {
        const db = tx ?? this.prisma;

        const entityDef = await db.entityDefinition.findUniqueOrThrow({
            where: {
                portalId_code: { portalId, code: entityCode },
            },
        });

        const defs = await db.fieldDefinition.findMany({
            where: {
                entityDefinitionId: entityDef.id,
                fieldKey: { in: Object.keys(values) },
            },
        });
        const defByKey = new Map(defs.map((d) => [d.fieldKey, d]));

        const touchedDefIds: string[] = [];
        const rows: Prisma.FieldValueCreateManyInput[] = [];
        for (const [fieldKey, raw] of Object.entries(values)) {
            const def = defByKey.get(fieldKey);
            if (!def) {
                continue;
            }
            touchedDefIds.push(def.id);
            if (raw === undefined || raw === null) {
                continue;
            }
            const items = def.isMultiple && Array.isArray(raw) ? raw : [raw];
            items.forEach((item, valueIndex) => {
                rows.push({
                    portalId,
                    entityRecordId,
                    fieldDefinitionId: def.id,
                    valueIndex,
                    valueJson: this.toJson(item),
                });
            });
        }
        if (touchedDefIds.length === 0) {
            return;
        }

        const write = async (client: Tx): Promise<void> => {
            await client.fieldValue.deleteMany({
                where: { entityRecordId, fieldDefinitionId: { in: touchedDefIds } },
            });
            if (rows.length > 0) {
                await client.fieldValue.createMany({ data: rows });
            }
        };

        if (tx) {
            await write(tx);
        } else {
            await this.prisma.$transaction(write);
        }
    }

    async getMemberFieldRows(memberId: string) {
        const entityRecordId = await this.resolveMemberEntityRecordId(memberId, this.prisma);
        return this.getRecordFieldRows(entityRecordId);
    }

    async getRecordFieldRows(entityRecordId: string) {
        return this.prisma.fieldValue.findMany({
            where: { entityRecordId },
            include: { fieldDefinition: true },
            orderBy: [{ fieldDefinitionId: "asc" }, { valueIndex: "asc" }],
        });
    }

    async getMemberFieldsPayload(memberId: string): Promise<
        {
            fieldKey: string;
            type: PortalFieldType;
            label: string | null;
            value: unknown;
        }[]
    > {
        const entityRecordId = await this.resolveMemberEntityRecordId(memberId, this.prisma);
        return this.getRecordFieldsPayload(entityRecordId);
    }

    /** Универсальное чтение значений записи (сгруппировано по полям, multi → массив). */
    async getRecordFieldsPayload(entityRecordId: string): Promise<
        {
            fieldKey: string;
            type: PortalFieldType;
            label: string | null;
            value: unknown;
        }[]
    > {
        const rows = await this.getRecordFieldRows(entityRecordId);
        const byDef = new Map<
            string,
            { def: (typeof rows)[0]["fieldDefinition"]; values: unknown[] }
        >();

        for (const row of rows) {
            const id = row.fieldDefinitionId;
            let bucket = byDef.get(id);
            if (!bucket) {
                bucket = { def: row.fieldDefinition, values: [] };
                byDef.set(id, bucket);
            }
            bucket.values.push(row.valueJson);
        }

        const out: {
            fieldKey: string;
            type: PortalFieldType;
            label: string | null;
            value: unknown;
            sortOrder: number;
        }[] = [];
        for (const { def, values } of byDef.values()) {
            const value = def.isMultiple ? values : (values[0] ?? null);
            out.push({
                fieldKey: def.fieldKey,
                type: def.type,
                label: def.label,
                value,
                sortOrder: def.sortOrder,
            });
        }
        out.sort((a, b) => a.sortOrder - b.sortOrder);
        return out.map(({ sortOrder: _s, ...rest }) => rest);
    }
}
