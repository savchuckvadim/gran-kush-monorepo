import { Injectable } from "@nestjs/common";

import {
    FormPurpose,
    PortalFieldType,
    PortalTypeEnum,
    Prisma,
    SubscriptionStatus,
} from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import { ENTITY_DEFINITION_CODES } from "../../constants/entity-definition-codes";

type Tx = Prisma.TransactionClient;

const ALL_PORTAL_TYPES: PortalTypeEnum[] = [
    PortalTypeEnum.CLUB,
    PortalTypeEnum.TATTOO_STUDIO,
    PortalTypeEnum.BEAUTY_STUDIO,
];

const MEMBER_LIFECYCLE_ITEMS: {
    key: string;
    label: string;
    color: string | null;
    sortOrder: number;
}[] = [
    { key: "inProgress", label: "In progress", color: "#64748b", sortOrder: 0 },
    { key: "pending", label: "Pending", color: "#ca8a04", sortOrder: 1 },
    { key: "approved", label: "Approved", color: "#16a34a", sortOrder: 2 },
    { key: "rejected", label: "Rejected", color: "#dc2626", sortOrder: 3 },
];

const MEMBER_FIELD_SEED: {
    fieldKey: string;
    type: PortalFieldType;
    label: string;
    sortOrder: number;
    showInFilters: boolean;
}[] = [
    {
        fieldKey: "first_name",
        type: PortalFieldType.string,
        label: "First name",
        sortOrder: 0,
        showInFilters: true,
    },
    {
        fieldKey: "last_name",
        type: PortalFieldType.string,
        label: "Last name",
        sortOrder: 1,
        showInFilters: false,
    },
    {
        fieldKey: "phone",
        type: PortalFieldType.phone,
        label: "Phone",
        sortOrder: 2,
        showInFilters: true,
    },
    {
        fieldKey: "birthday",
        type: PortalFieldType.date,
        label: "Birthday",
        sortOrder: 3,
        showInFilters: false,
    },
    {
        fieldKey: "address",
        type: PortalFieldType.text,
        label: "Address",
        sortOrder: 4,
        showInFilters: false,
    },
    {
        fieldKey: "notes",
        type: PortalFieldType.text,
        label: "Notes",
        sortOrder: 5,
        showInFilters: false,
    },
    {
        fieldKey: "document_type",
        type: PortalFieldType.string,
        label: "Document type",
        sortOrder: 6,
        showInFilters: false,
    },
    {
        fieldKey: "document_number",
        type: PortalFieldType.string,
        label: "Document number",
        sortOrder: 7,
        showInFilters: false,
    },
    {
        fieldKey: "is_medical",
        type: PortalFieldType.boolean,
        label: "Medical use",
        sortOrder: 8,
        showInFilters: false,
    },
    {
        fieldKey: "is_mj",
        type: PortalFieldType.boolean,
        label: "MJ",
        sortOrder: 9,
        showInFilters: false,
    },
    {
        fieldKey: "is_recreation",
        type: PortalFieldType.boolean,
        label: "Recreation",
        sortOrder: 10,
        showInFilters: false,
    },
];

const ORDER_STAGES: {
    name: string;
    sortOrder: number;
    color: string | null;
    semantic: "NEW" | "IN_PROGRESS" | "SUCCESS" | "FAILURE";
    isTerminalSuccess: boolean;
    isTerminalFailure: boolean;
}[] = [
    {
        name: "Pending",
        sortOrder: 0,
        color: "#64748b",
        semantic: "NEW",
        isTerminalSuccess: false,
        isTerminalFailure: false,
    },
    {
        name: "Confirmed",
        sortOrder: 1,
        color: "#2563eb",
        semantic: "IN_PROGRESS",
        isTerminalSuccess: false,
        isTerminalFailure: false,
    },
    {
        name: "Preparing",
        sortOrder: 2,
        color: "#7c3aed",
        semantic: "IN_PROGRESS",
        isTerminalSuccess: false,
        isTerminalFailure: false,
    },
    {
        name: "Ready",
        sortOrder: 3,
        color: "#ca8a04",
        semantic: "IN_PROGRESS",
        isTerminalSuccess: false,
        isTerminalFailure: false,
    },
    {
        name: "Completed",
        sortOrder: 4,
        color: "#16a34a",
        semantic: "SUCCESS",
        isTerminalSuccess: true,
        isTerminalFailure: false,
    },
    {
        name: "Cancelled",
        sortOrder: 5,
        color: "#dc2626",
        semantic: "FAILURE",
        isTerminalSuccess: false,
        isTerminalFailure: true,
    },
];

const FORM_PURPOSES: FormPurpose[] = [
    FormPurpose.public_registration,
    FormPurpose.crm_create,
    FormPurpose.crm_detail,
    FormPurpose.member_cabinet,
];

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
        await this.ensureGlobalTemplates(db);
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

        if (gt.code === ENTITY_DEFINITION_CODES.MEMBER) {
            const sortedFields = [...gt.fieldTemplates].sort((a, b) => a.sortOrder - b.sortOrder);
            for (const purpose of FORM_PURPOSES) {
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
                    const required =
                        (purpose === FormPurpose.public_registration ||
                            purpose === FormPurpose.crm_create) &&
                        ft.fieldKey === "first_name";
                    await db.formDefinitionItem.create({
                        data: {
                            formDefinitionId: form.id,
                            fieldDefinitionId,
                            sortOrder: ft.sortOrder,
                            required,
                            visible: true,
                            readOnly: false,
                        },
                    });
                }
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

    private async ensureGlobalTemplates(db: Tx): Promise<void> {
        const existing = await db.globalEntityTemplate.findUnique({
            where: { code: ENTITY_DEFINITION_CODES.MEMBER },
        });
        if (existing) {
            return;
        }

        const portalTypesJson = ALL_PORTAL_TYPES as unknown as Prisma.InputJsonValue;

        await db.globalEntityTemplate.create({
            data: {
                code: ENTITY_DEFINITION_CODES.MEMBER,
                name: "Member",
                applicablePortalTypes: portalTypesJson,
                modulesJson: ["crm"] as unknown as Prisma.InputJsonValue,
                statusSetTemplates: {
                    create: [
                        {
                            code: "member_lifecycle",
                            isSystem: true,
                            isImmutable: true,
                            items: {
                                create: MEMBER_LIFECYCLE_ITEMS.map((i) => ({
                                    key: i.key,
                                    label: i.label,
                                    color: i.color,
                                    sortOrder: i.sortOrder,
                                    isSystem: true,
                                })),
                            },
                        },
                    ],
                },
                fieldTemplates: {
                    create: MEMBER_FIELD_SEED.map((f) => ({
                        fieldKey: f.fieldKey,
                        type: f.type,
                        label: f.label,
                        isSystem: true,
                        isImmutable: true,
                        deletableByPortal: false,
                        customizableByPortal: true,
                        sortOrder: f.sortOrder,
                        showInFilters: f.showInFilters,
                    })),
                },
            },
        });

        await db.globalEntityTemplate.create({
            data: {
                code: ENTITY_DEFINITION_CODES.ORDER,
                name: "Order",
                applicablePortalTypes: portalTypesJson,
                modulesJson: ["crm"] as unknown as Prisma.InputJsonValue,
                stageCategoryTemplates: {
                    create: [
                        {
                            code: "default",
                            name: "Default funnel",
                            isDefault: true,
                            isSystem: true,
                            hiddenInUi: false,
                            stages: {
                                create: ORDER_STAGES.map((s) => ({
                                    name: s.name,
                                    sortOrder: s.sortOrder,
                                    color: s.color,
                                    semantic: s.semantic,
                                    isTerminalSuccess: s.isTerminalSuccess,
                                    isTerminalFailure: s.isTerminalFailure,
                                })),
                            },
                        },
                    ],
                },
            },
        });
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
