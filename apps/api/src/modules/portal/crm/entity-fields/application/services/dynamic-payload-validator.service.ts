import { BadRequestException, Injectable } from "@nestjs/common";

import { FormPurpose, PortalFieldType, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

@Injectable()
export class DynamicPayloadValidatorService {
    constructor(
        private readonly formSchema: FormSchemaService,
        private readonly prisma: PrismaService
    ) {}

    async validateMemberPayload(
        portalId: string,
        purpose: FormPurpose,
        payload: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const { fields } = await this.formSchema.getFormSchema(
            portalId,
            ENTITY_DEFINITION_CODES.MEMBER,
            purpose
        );
        const result: Record<string, unknown> = {};

        for (const item of fields) {
            if (!item.visible && !item.required) {
                continue;
            }
            if (item.readOnly && purpose !== FormPurpose.crm_detail) {
                continue;
            }

            const key = item.fieldKey;
            const raw = payload[key];

            if (item.required) {
                if (raw === undefined || raw === null || raw === "") {
                    throw new BadRequestException(`Field "${key}" is required`);
                }
            }

            if (raw === undefined || raw === null || raw === "") {
                continue;
            }

            result[key] = this.coerceAndValidateField(key, item.type as PortalFieldType, raw, item);
        }

        return result;
    }

    async validateMemberPartialUpdate(
        portalId: string,
        payload: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const keys = Object.keys(payload);
        if (keys.length === 0) {
            return {};
        }

        const memberDef = await this.prisma.entityDefinition.findUnique({
            where: {
                portalId_code: { portalId, code: ENTITY_DEFINITION_CODES.MEMBER },
            },
        });
        if (!memberDef) {
            throw new BadRequestException("Member entity is not configured for this portal");
        }

        const defs = await this.prisma.fieldDefinition.findMany({
            where: {
                entityDefinitionId: memberDef.id,
                fieldKey: { in: keys },
                isActive: true,
            },
            include: { options: { where: { isActive: true } } },
        });

        const result: Record<string, unknown> = {};
        for (const key of keys) {
            const def = defs.find((d) => d.fieldKey === key);
            if (!def) {
                throw new BadRequestException(`Unknown or inactive field: ${key}`);
            }
            const raw = payload[key];
            if (raw === undefined) {
                continue;
            }
            result[key] = this.coerceAndValidateField(key, def.type, raw, {
                options: def.options.map((o) => ({ valueKey: o.valueKey })),
                isMultiple: def.isMultiple,
                validationJson: def.validationJson,
            });
        }
        return result;
    }

    private coerceAndValidateField(
        key: string,
        type: PortalFieldType,
        raw: unknown,
        item: {
            options: { valueKey: string }[];
            isMultiple: boolean;
            validationJson: Prisma.JsonValue | null;
        }
    ): unknown {
        const rules = item.validationJson as Record<string, unknown> | null;

        switch (type) {
            case PortalFieldType.string:
            case PortalFieldType.text:
            case PortalFieldType.document:
            case PortalFieldType.file:
            case PortalFieldType.signature: {
                if (typeof raw !== "string") {
                    throw new BadRequestException(`Field "${key}" must be a string`);
                }
                const min = rules?.minLength as number | undefined;
                const max = rules?.maxLength as number | undefined;
                if (min !== undefined && raw.length < min) {
                    throw new BadRequestException(`Field "${key}" is too short`);
                }
                if (max !== undefined && raw.length > max) {
                    throw new BadRequestException(`Field "${key}" is too long`);
                }
                return raw;
            }
            case PortalFieldType.email: {
                if (typeof raw !== "string") {
                    throw new BadRequestException(`Field "${key}" must be a string`);
                }
                const email = raw.trim().toLowerCase();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    throw new BadRequestException(`Field "${key}" must be a valid email`);
                }
                return email;
            }
            case PortalFieldType.phone: {
                if (typeof raw !== "string") {
                    throw new BadRequestException(`Field "${key}" must be a string`);
                }
                if (!/^\+?[1-9]\d{1,14}$/.test(raw)) {
                    throw new BadRequestException(`Field "${key}" must be a valid phone`);
                }
                return raw;
            }
            case PortalFieldType.int: {
                const n = typeof raw === "number" ? raw : Number(raw);
                if (!Number.isInteger(n)) {
                    throw new BadRequestException(`Field "${key}" must be an integer`);
                }
                return n;
            }
            case PortalFieldType.decimal: {
                const n = typeof raw === "number" ? raw : Number(raw);
                if (Number.isNaN(n)) {
                    throw new BadRequestException(`Field "${key}" must be a number`);
                }
                return n;
            }
            case PortalFieldType.boolean: {
                if (typeof raw !== "boolean") {
                    throw new BadRequestException(`Field "${key}" must be a boolean`);
                }
                return raw;
            }
            case PortalFieldType.date:
            case PortalFieldType.datetime: {
                if (typeof raw !== "string") {
                    throw new BadRequestException(`Field "${key}" must be an ISO date string`);
                }
                const d = new Date(raw);
                if (Number.isNaN(d.getTime())) {
                    throw new BadRequestException(`Field "${key}" must be a valid date`);
                }
                return raw;
            }
            case PortalFieldType.single_select:
            case PortalFieldType.relation: {
                if (typeof raw !== "string") {
                    throw new BadRequestException(`Field "${key}" must be a string`);
                }
                const allowed = new Set(item.options.map((o) => o.valueKey));
                if (allowed.size > 0 && !allowed.has(raw)) {
                    throw new BadRequestException(`Invalid option for "${key}"`);
                }
                return raw;
            }
            case PortalFieldType.multi_select: {
                if (!Array.isArray(raw) || !raw.every((x) => typeof x === "string")) {
                    throw new BadRequestException(`Field "${key}" must be an array of strings`);
                }
                const allowed = new Set(item.options.map((o) => o.valueKey));
                if (allowed.size > 0) {
                    for (const v of raw) {
                        if (!allowed.has(v)) {
                            throw new BadRequestException(`Invalid option for "${key}"`);
                        }
                    }
                }
                return raw;
            }
            case PortalFieldType.url: {
                if (typeof raw !== "string") {
                    throw new BadRequestException(`Field "${key}" must be a string`);
                }
                return raw;
            }
            default:
                return raw;
        }
    }
}
