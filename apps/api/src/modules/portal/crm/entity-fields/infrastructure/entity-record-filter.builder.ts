import { BadRequestException, Injectable } from "@nestjs/common";

import { PortalFieldType, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import type {
    FieldCondition,
    FieldFilterOp,
} from "@modules/portal/crm/entity-fields/domain/entity-filter";

const TEXT_TYPES: PortalFieldType[] = [
    PortalFieldType.string,
    PortalFieldType.text,
    PortalFieldType.email,
    PortalFieldType.phone,
    PortalFieldType.url,
];
const NUMBER_TYPES: PortalFieldType[] = [PortalFieldType.int, PortalFieldType.decimal];

const TEXT_OPS: readonly FieldFilterOp[] = ["contains", "eq"];
const OPTION_OPS: readonly FieldFilterOp[] = ["eq", "in"];
const RANGE_OPS: readonly FieldFilterOp[] = ["eq", "gte", "lte"];

/** file, signature и document по значению не фильтруются. */
const OPS_BY_TYPE: Partial<Record<PortalFieldType, readonly FieldFilterOp[]>> = {
    ...Object.fromEntries(TEXT_TYPES.map((type) => [type, TEXT_OPS])),
    [PortalFieldType.single_select]: OPTION_OPS,
    [PortalFieldType.multi_select]: OPTION_OPS,
    [PortalFieldType.relation]: OPTION_OPS,
    [PortalFieldType.boolean]: ["eq"],
    [PortalFieldType.int]: RANGE_OPS,
    [PortalFieldType.decimal]: RANGE_OPS,
    [PortalFieldType.date]: RANGE_OPS,
    [PortalFieldType.datetime]: ["gte", "lte"],
};

const MAX_SEARCH_WORDS = 5;
const MAX_TEXT = 100;
const MAX_OPTION = 255;
const MAX_OPTIONS = 50;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const isText = (value: unknown, max: number): value is string =>
    typeof value === "string" && value.length > 0 && value.length <= max;
const isNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);
const isDate = (value: unknown): value is string =>
    typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));

/** `%`, `_` и `\` в запросе — обычные символы: Prisma не экранирует шаблоны LIKE сама. */
export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Слова поиска; каждое должно найтись хотя бы в одном поле. */
export const searchWords = (q: string | undefined): string[] =>
    (q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_WORDS);

/** Запись, у которой какое-нибудь текстовое поле содержит слово (без учёта регистра). */
export const recordTextContains = (word: string): Prisma.EntityRecordWhereInput => ({
    fieldValues: {
        some: {
            fieldDefinition: { isActive: true, type: { in: TEXT_TYPES } },
            // без path Prisma 7 строит lower(jsonb), и Postgres отвечает ошибкой
            valueJson: { path: [], string_contains: escapeLike(word), mode: "insensitive" },
        },
    },
});

/** Условия по полям любой сущности портала → фильтры её записи. */
@Injectable()
export class EntityRecordFilterBuilder {
    constructor(private readonly prisma: PrismaService) {}

    /** Неизвестное поле, неподходящее условие или значение не того типа — 400. */
    async conditions(
        portalId: string,
        entityCode: string,
        conditions: FieldCondition[] | undefined
    ): Promise<Prisma.EntityRecordWhereInput[]> {
        if (!conditions?.length) {
            return [];
        }
        const defs = await this.prisma.fieldDefinition.findMany({
            where: {
                entityDefinition: { portalId, code: entityCode },
                fieldKey: { in: [...new Set(conditions.map((c) => c.field))] },
                isActive: true,
            },
            select: { id: true, fieldKey: true, type: true },
        });
        const defByKey = new Map(defs.map((def) => [def.fieldKey, def]));

        return conditions.map((condition) => {
            const def = defByKey.get(condition.field);
            if (!def) {
                throw new BadRequestException(`Unknown filter field: ${condition.field}`);
            }
            if (!OPS_BY_TYPE[def.type]?.includes(condition.op)) {
                throw new BadRequestException(
                    `Filter "${condition.op}" is not supported for field: ${condition.field}`
                );
            }
            return {
                fieldValues: {
                    some: { fieldDefinitionId: def.id, ...this.valueWhere(def.type, condition) },
                },
            };
        });
    }

    private valueWhere(
        type: PortalFieldType,
        { field, op, value }: FieldCondition
    ): Prisma.FieldValueWhereInput {
        const invalid = () => new BadRequestException(`Invalid value for filter field: ${field}`);
        // multi_select хранится одним массивом или строкой на каждое значение (isMultiple)
        const optionMatch = (option: string): Prisma.FieldValueWhereInput[] =>
            type === PortalFieldType.multi_select
                ? [{ valueJson: { equals: option } }, { valueJson: { array_contains: [option] } }]
                : [{ valueJson: { equals: option } }];

        switch (op) {
            case "contains":
                if (!isText(value, MAX_TEXT)) throw invalid();
                return {
                    valueJson: {
                        path: [],
                        string_contains: escapeLike(value),
                        mode: "insensitive",
                    },
                };
            case "in":
                if (
                    !Array.isArray(value) ||
                    value.length === 0 ||
                    value.length > MAX_OPTIONS ||
                    !value.every((option) => isText(option, MAX_OPTION))
                ) {
                    throw invalid();
                }
                return { OR: value.flatMap(optionMatch) };
            case "eq":
                if (type === PortalFieldType.boolean) {
                    if (typeof value !== "boolean") throw invalid();
                    return { valueJson: { equals: value } };
                }
                if (NUMBER_TYPES.includes(type)) {
                    if (!isNumber(value)) throw invalid();
                    return { valueJson: { equals: value } };
                }
                if (type === PortalFieldType.date) {
                    if (!isDate(value)) throw invalid();
                    return { valueJson: { equals: value } };
                }
                if (!isText(value, MAX_OPTION)) throw invalid();
                return { OR: optionMatch(value) };
            case "gte":
            case "lte": {
                const isValid = NUMBER_TYPES.includes(type) ? isNumber(value) : isDate(value);
                if (!isValid) throw invalid();
                const bound = value as number | string;
                return { valueJson: op === "gte" ? { gte: bound } : { lte: bound } };
            }
        }
    }
}
