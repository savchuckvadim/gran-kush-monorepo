import { BadRequestException, Injectable } from "@nestjs/common";

import { FormPurpose, PortalFieldType } from "@prisma/client";

import { DEFAULT_CONTENT_LOCALE } from "@common/i18n";
import { PrismaService } from "@common/prisma/prisma.service";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

import { coerceDynamicFieldValue } from "./coerce-dynamic-field-value";

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
        return this.validatePayload(portalId, ENTITY_DEFINITION_CODES.MEMBER, purpose, payload);
    }

    /** Универсальная валидация payload по форме любой сущности. */
    async validatePayload(
        portalId: string,
        entityCode: string,
        purpose: FormPurpose,
        payload: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const { fields } = await this.formSchema.getFormSchema(
            portalId,
            entityCode,
            purpose,
            DEFAULT_CONTENT_LOCALE
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

            result[key] = coerceDynamicFieldValue(key, item.type as PortalFieldType, raw, item);
        }

        return result;
    }

    async validateMemberPartialUpdate(
        portalId: string,
        payload: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        return this.validatePartialUpdate(portalId, ENTITY_DEFINITION_CODES.MEMBER, payload);
    }

    /** Универсальная частичная валидация полей любой сущности (без формы). */
    async validatePartialUpdate(
        portalId: string,
        entityCode: string,
        payload: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const keys = Object.keys(payload);
        if (keys.length === 0) {
            return {};
        }

        const entityDef = await this.prisma.entityDefinition.findUnique({
            where: {
                portalId_code: { portalId, code: entityCode },
            },
        });
        if (!entityDef) {
            throw new BadRequestException(
                `Entity "${entityCode}" is not configured for this portal`
            );
        }

        const defs = await this.prisma.fieldDefinition.findMany({
            where: {
                entityDefinitionId: entityDef.id,
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
            result[key] = coerceDynamicFieldValue(key, def.type, raw, {
                options: def.options.map((o) => ({ valueKey: o.valueKey })),
                isMultiple: def.isMultiple,
                validationJson: def.validationJson,
            });
        }
        return result;
    }
}
