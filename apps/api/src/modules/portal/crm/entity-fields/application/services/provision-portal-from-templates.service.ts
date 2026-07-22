import { Injectable } from "@nestjs/common";

import { FormPurpose, PortalTypeEnum, Prisma, SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { ensureGlobalEntityTemplates } from "@common/reference-data/global-templates.seed";

import { ENTITY_DEFINITION_CODES } from "../../constants/entity-definition-codes";

type Tx = Prisma.TransactionClient;

const ALL_FORM_PURPOSES: FormPurpose[] = [
    FormPurpose.public_registration,
    FormPurpose.crm_create,
    FormPurpose.crm_detail,
    FormPurpose.member_cabinet,
];

const CRM_FORM_PURPOSES: FormPurpose[] = [FormPurpose.crm_create, FormPurpose.crm_detail];

type GlobalTemplateFull = Prisma.GlobalEntityTemplateGetPayload<{
    include: {
        fieldTemplates: { include: { options: true } };
        statusSetTemplates: { include: { items: true } };
        stageCategoryTemplates: { include: { stages: true } };
    };
}>;

@Injectable()
export class ProvisionPortalFromTemplatesService {
    constructor(private readonly prisma: PrismaService) {}

    async provisionPortal(portalId: string, portalType: PortalTypeEnum, tx?: Tx): Promise<void> {
        const db = tx ?? this.prisma;
        await ensureGlobalEntityTemplates(db);
        await this.ensureDefaultBillingPlan(db);

        const templates = await db.globalEntityTemplate.findMany({
            where: { isActive: true },
            include: {
                fieldTemplates: { include: { options: true }, orderBy: { sortOrder: "asc" } },
                statusSetTemplates: { include: { items: { orderBy: { sortOrder: "asc" } } } },
                stageCategoryTemplates: { include: { stages: { orderBy: { sortOrder: "asc" } } } },
            },
        });

        for (const gt of templates) {
            if (!this.templateAppliesToPortalType(gt.applicablePortalTypes, portalType)) {
                continue;
            }
            const exists = await db.entityDefinition.findUnique({
                where: { portalId_code: { portalId, code: gt.code } },
            });
            if (exists) {
                continue;
            }
            await this.materializeTemplate(db, portalId, gt);
        }

        await this.ensurePortalTrialSubscription(db, portalId);
    }

    private templateAppliesToPortalType(
        applicable: Prisma.JsonValue | null | undefined,
        portalType: PortalTypeEnum
    ): boolean {
        if (applicable == null) {
            return true;
        }
        if (!Array.isArray(applicable)) {
            return true;
        }
        return applicable.includes(portalType);
    }

    private async materializeTemplate(
        db: Tx,
        portalId: string,
        gt: GlobalTemplateFull
    ): Promise<void> {
        const ed = await db.entityDefinition.create({
            data: {
                portalId,
                code: gt.code,
                name: gt.name,
                isSystem: true,
                isActive: true,
                applicablePortalTypes: gt.applicablePortalTypes ?? Prisma.JsonNull,
                globalTemplateId: gt.id,
            },
        });

        for (const st of gt.statusSetTemplates) {
            await db.statusSet.create({
                data: {
                    portalId,
                    entityDefinitionId: ed.id,
                    code: st.code,
                    isSystem: st.isSystem,
                    isImmutable: st.isImmutable,
                    items: {
                        create: st.items.map((i) => ({
                            key: i.key,
                            label: i.label,
                            ...(i.labelI18n != null
                                ? { labelI18n: i.labelI18n as Prisma.InputJsonValue }
                                : {}),
                            color: i.color,
                            sortOrder: i.sortOrder,
                            isActive: i.isActive,
                            isSystem: i.isSystem,
                            semantic: i.semantic,
                        })),
                    },
                },
            });
        }

        const fieldIdByKey = new Map<string, string>();
        for (const ft of gt.fieldTemplates) {
            const fd = await db.fieldDefinition.create({
                data: {
                    entityDefinitionId: ed.id,
                    fieldKey: ft.fieldKey,
                    type: ft.type,
                    label: ft.label,
                    ...(ft.labelI18n != null
                        ? { labelI18n: ft.labelI18n as Prisma.InputJsonValue }
                        : {}),
                    helpText: ft.helpText,
                    isActive: true,
                    isSystem: ft.isSystem,
                    isImmutable: ft.isImmutable,
                    deletableByPortal: ft.deletableByPortal,
                    customizableByPortal: ft.customizableByPortal,
                    documentType: ft.documentType,
                    ...(ft.defaultValueJson != null
                        ? { defaultValueJson: ft.defaultValueJson as Prisma.InputJsonValue }
                        : {}),
                    ...(ft.validationJson != null
                        ? { validationJson: ft.validationJson as Prisma.InputJsonValue }
                        : {}),
                    isMultiple: ft.isMultiple,
                    sortOrder: ft.sortOrder,
                    showInFilters: ft.showInFilters,
                    options: {
                        create: ft.options.map((o) => ({
                            valueKey: o.valueKey,
                            label: o.label,
                            sortOrder: o.sortOrder,
                            color: o.color,
                            isActive: o.isActive,
                        })),
                    },
                },
            });
            fieldIdByKey.set(ft.fieldKey, fd.id);
        }

        const purposes =
            gt.code === ENTITY_DEFINITION_CODES.MEMBER ? ALL_FORM_PURPOSES : CRM_FORM_PURPOSES;
        const sortedFields = [...gt.fieldTemplates].sort((a, b) => a.sortOrder - b.sortOrder);
        for (const purpose of purposes) {
            const form = await db.formDefinition.create({
                data: {
                    portalId,
                    entityDefinitionId: ed.id,
                    purpose,
                },
            });
            for (const ft of sortedFields) {
                const fieldDefinitionId = fieldIdByKey.get(ft.fieldKey);
                if (!fieldDefinitionId) {
                    continue;
                }
                await db.formDefinitionItem.create({
                    data: {
                        formDefinitionId: form.id,
                        fieldDefinitionId,
                        sortOrder: ft.sortOrder,
                        required: this.isRequiredInPurpose(ft.validationJson, purpose),
                        visible: true,
                        readOnly: false,
                    },
                });
            }
        }

        for (const sct of gt.stageCategoryTemplates) {
            await db.stageCategory.create({
                data: {
                    portalId,
                    entityDefinitionId: ed.id,
                    code: sct.code,
                    name: sct.name,
                    isDefault: sct.isDefault,
                    isSystem: sct.isSystem,
                    hiddenInUi: sct.hiddenInUi,
                    stages: {
                        create: sct.stages.map((s) => ({
                            name: s.name,
                            sortOrder: s.sortOrder,
                            color: s.color,
                            semantic: s.semantic,
                            isTerminalSuccess: s.isTerminalSuccess,
                            isTerminalFailure: s.isTerminalFailure,
                        })),
                    },
                },
            });
        }
    }

    private isRequiredInPurpose(
        validationJson: Prisma.JsonValue | null | undefined,
        purpose: FormPurpose
    ): boolean {
        if (validationJson == null || typeof validationJson !== "object") {
            return false;
        }
        const required = (validationJson as Record<string, unknown>)["requiredInPurposes"];
        return Array.isArray(required) && required.includes(purpose);
    }

    private async ensureDefaultBillingPlan(db: Tx): Promise<void> {
        const exists = await db.billingPlan.findUnique({ where: { code: "trial" } });
        if (exists) {
            return;
        }
        await db.billingPlan.create({
            data: {
                code: "trial",
                name: "Trial",
                priceAmount: 0,
                currency: "EUR",
                interval: "month",
                featuresJson: { crm: true, sites: true, messenger: false } as Prisma.InputJsonValue,
            },
        });
    }

    private async ensurePortalTrialSubscription(db: Tx, portalId: string): Promise<void> {
        const sub = await db.portalSubscription.findUnique({ where: { portalId } });
        if (sub) {
            return;
        }
        const plan = await db.billingPlan.findFirst({ where: { code: "trial", isActive: true } });
        if (!plan) {
            return;
        }
        await db.portalSubscription.create({
            data: {
                portalId,
                planId: plan.id,
                status: SubscriptionStatus.trialing,
            },
        });
    }
}
