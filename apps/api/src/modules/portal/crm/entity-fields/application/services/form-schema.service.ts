import { Injectable, NotFoundException } from "@nestjs/common";

import { FormPurpose, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { MemberLifecycleStatusItemDto } from "@modules/portal/crm/entity-fields/api/dto/entity-fields-settings-response.dto";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

export type FormFieldSchemaItem = {
    fieldKey: string;
    type: string;
    label: string | null;
    helpText: string | null;
    required: boolean;
    visible: boolean;
    readOnly: boolean;
    isMultiple: boolean;
    sectionCode: string | null;
    sortOrder: number;
    validationJson: Prisma.JsonValue | null;
    defaultValueJson: Prisma.JsonValue | null;
    options: { valueKey: string; label: string; color: string | null; sortOrder: number }[];
};

@Injectable()
export class FormSchemaService {
    constructor(private readonly prisma: PrismaService) {}

    private async getEntityDefinitionId(portalId: string, code: string): Promise<string> {
        const ed = await this.prisma.entityDefinition.findUnique({
            where: { portalId_code: { portalId, code } },
            select: { id: true },
        });
        if (!ed) {
            throw new NotFoundException(`Entity definition "${code}" not found for portal`);
        }
        return ed.id;
    }

    async getFormSchema(
        portalId: string,
        entityCode: string,
        purpose: FormPurpose
    ): Promise<{ purpose: FormPurpose; fields: FormFieldSchemaItem[] }> {
        const entityDefinitionId = await this.getEntityDefinitionId(portalId, entityCode);
        const form = await this.prisma.formDefinition.findUnique({
            where: {
                portalId_entityDefinitionId_purpose: { portalId, entityDefinitionId, purpose },
            },
            include: {
                items: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                        fieldDefinition: {
                            include: {
                                options: {
                                    where: { isActive: true },
                                    orderBy: { sortOrder: "asc" },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!form) {
            throw new NotFoundException(`Form not found for purpose ${purpose}`);
        }

        const fields: FormFieldSchemaItem[] = [];
        for (const item of form.items) {
            const def = item.fieldDefinition;
            if (!def.isActive) {
                continue;
            }
            const label = def.labelOverride ?? def.label;
            const readOnly = def.readOnlyOverride || item.readOnly;
            fields.push({
                fieldKey: def.fieldKey,
                type: def.type,
                label,
                helpText: def.helpText,
                required: item.required,
                visible: def.hidden ? false : item.visible,
                readOnly,
                isMultiple: def.isMultiple,
                sectionCode: item.sectionCode,
                sortOrder: item.sortOrder,
                validationJson: def.validationJson,
                defaultValueJson: def.defaultValueJson,
                options: def.options.map((o) => ({
                    valueKey: o.valueKey,
                    label: o.label,
                    color: o.color,
                    sortOrder: o.sortOrder,
                })),
            });
        }

        return { purpose, fields };
    }

    async getFilterableMemberFields(portalId: string): Promise<FormFieldSchemaItem[]> {
        const entityDefinitionId = await this.getEntityDefinitionId(
            portalId,
            ENTITY_DEFINITION_CODES.MEMBER
        );
        const defs = await this.prisma.fieldDefinition.findMany({
            where: {
                entityDefinitionId,
                isActive: true,
                showInFilters: true,
            },
            orderBy: { sortOrder: "asc" },
            include: {
                options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
            },
        });

        return defs.map((def) => ({
            fieldKey: def.fieldKey,
            type: def.type,
            label: def.labelOverride ?? def.label,
            helpText: def.helpText,
            required: false,
            visible: !def.hidden,
            readOnly: def.readOnlyOverride,
            isMultiple: def.isMultiple,
            sectionCode: null,
            sortOrder: def.sortOrder,
            validationJson: def.validationJson,
            defaultValueJson: def.defaultValueJson,
            options: def.options.map((o) => ({
                valueKey: o.valueKey,
                label: o.label,
                color: o.color,
                sortOrder: o.sortOrder,
            })),
        }));
    }

    async getMemberLifecycleStatusItems(portalId: string): Promise<MemberLifecycleStatusItemDto[]> {
        const entityDefinitionId = await this.getEntityDefinitionId(
            portalId,
            ENTITY_DEFINITION_CODES.MEMBER
        );
        const set = await this.prisma.statusSet.findFirst({
            where: { portalId, code: "member_lifecycle", entityDefinitionId },
            include: {
                items: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
            },
        });
        if (!set) {
            return [];
        }
        return set.items.map((i) => ({
            id: i.id,
            key: i.key,
            label: i.label,
            color: i.color,
            sortOrder: i.sortOrder,
        }));
    }
}
