import { PortalFieldType, PortalTypeEnum, Prisma, StageSemantic } from "@prisma/client";

type Db = Prisma.TransactionClient;

const ALL_PORTAL_TYPES: PortalTypeEnum[] = [
    PortalTypeEnum.CLUB,
    PortalTypeEnum.TATTOO_STUDIO,
    PortalTypeEnum.BEAUTY_STUDIO,
];

export interface GlobalFieldSeed {
    fieldKey: string;
    type: PortalFieldType;
    label: string;
    sortOrder: number;
    showInFilters?: boolean;
    isMultiple?: boolean;
    documentType?: string;
    /** validationJson.requiredInPurposes управляет FormDefinitionItem.required при провижининге */
    requiredInPurposes?: string[];
    options?: { valueKey: string; label: string; sortOrder: number; color?: string }[];
}

export interface GlobalStatusSetSeed {
    code: string;
    items: { key: string; label: string; color: string | null; sortOrder: number }[];
}

export interface GlobalStageCategorySeed {
    code: string;
    name: string;
    stages: {
        name: string;
        sortOrder: number;
        color: string | null;
        semantic: StageSemantic;
        isTerminalSuccess: boolean;
        isTerminalFailure: boolean;
    }[];
}

export interface GlobalEntityTemplateSeed {
    code: string;
    name: string;
    fields: GlobalFieldSeed[];
    statusSets: GlobalStatusSetSeed[];
    stageCategories: GlobalStageCategorySeed[];
}

const MEMBER_TEMPLATE: GlobalEntityTemplateSeed = {
    code: "member",
    name: "Member",
    fields: [
        {
            fieldKey: "first_name",
            type: PortalFieldType.string,
            label: "First name",
            sortOrder: 0,
            showInFilters: true,
            requiredInPurposes: ["public_registration", "crm_create"],
        },
        { fieldKey: "last_name", type: PortalFieldType.string, label: "Last name", sortOrder: 1 },
        {
            fieldKey: "phone",
            type: PortalFieldType.phone,
            label: "Phone",
            sortOrder: 2,
            showInFilters: true,
        },
        { fieldKey: "birthday", type: PortalFieldType.date, label: "Birthday", sortOrder: 3 },
        { fieldKey: "address", type: PortalFieldType.text, label: "Address", sortOrder: 4 },
        { fieldKey: "notes", type: PortalFieldType.text, label: "Notes", sortOrder: 5 },
        {
            fieldKey: "is_medical",
            type: PortalFieldType.boolean,
            label: "Medical use",
            sortOrder: 6,
        },
        { fieldKey: "is_mj", type: PortalFieldType.boolean, label: "MJ", sortOrder: 7 },
        {
            fieldKey: "is_recreation",
            type: PortalFieldType.boolean,
            label: "Recreation",
            sortOrder: 8,
        },
        {
            fieldKey: "identity_document",
            type: PortalFieldType.document,
            label: "Identity document",
            sortOrder: 9,
            documentType: "identity",
        },
        {
            fieldKey: "signature",
            type: PortalFieldType.signature,
            label: "Signature",
            sortOrder: 10,
        },
    ],
    statusSets: [
        {
            code: "member_lifecycle",
            items: [
                { key: "inProgress", label: "In progress", color: "#64748b", sortOrder: 0 },
                { key: "pending", label: "Pending", color: "#ca8a04", sortOrder: 1 },
                { key: "approved", label: "Approved", color: "#16a34a", sortOrder: 2 },
                { key: "rejected", label: "Rejected", color: "#dc2626", sortOrder: 3 },
            ],
        },
    ],
    stageCategories: [],
};

const EMPLOYEE_TEMPLATE: GlobalEntityTemplateSeed = {
    code: "employee",
    name: "Employee",
    fields: [
        {
            fieldKey: "first_name",
            type: PortalFieldType.string,
            label: "First name",
            sortOrder: 0,
            showInFilters: true,
            requiredInPurposes: ["crm_create"],
        },
        { fieldKey: "last_name", type: PortalFieldType.string, label: "Last name", sortOrder: 1 },
        { fieldKey: "phone", type: PortalFieldType.phone, label: "Phone", sortOrder: 2 },
        { fieldKey: "position", type: PortalFieldType.string, label: "Position", sortOrder: 3 },
        { fieldKey: "department", type: PortalFieldType.string, label: "Department", sortOrder: 4 },
    ],
    statusSets: [],
    stageCategories: [],
};

const ORDER_TEMPLATE: GlobalEntityTemplateSeed = {
    code: "order",
    name: "Order",
    fields: [],
    statusSets: [],
    stageCategories: [
        {
            code: "default",
            name: "Default funnel",
            stages: [
                {
                    name: "Pending",
                    sortOrder: 0,
                    color: "#64748b",
                    semantic: StageSemantic.NEW,
                    isTerminalSuccess: false,
                    isTerminalFailure: false,
                },
                {
                    name: "Confirmed",
                    sortOrder: 1,
                    color: "#2563eb",
                    semantic: StageSemantic.IN_PROGRESS,
                    isTerminalSuccess: false,
                    isTerminalFailure: false,
                },
                {
                    name: "Preparing",
                    sortOrder: 2,
                    color: "#7c3aed",
                    semantic: StageSemantic.IN_PROGRESS,
                    isTerminalSuccess: false,
                    isTerminalFailure: false,
                },
                {
                    name: "Ready",
                    sortOrder: 3,
                    color: "#ca8a04",
                    semantic: StageSemantic.IN_PROGRESS,
                    isTerminalSuccess: false,
                    isTerminalFailure: false,
                },
                {
                    name: "Completed",
                    sortOrder: 4,
                    color: "#16a34a",
                    semantic: StageSemantic.SUCCESS,
                    isTerminalSuccess: true,
                    isTerminalFailure: false,
                },
                {
                    name: "Cancelled",
                    sortOrder: 5,
                    color: "#dc2626",
                    semantic: StageSemantic.FAILURE,
                    isTerminalSuccess: false,
                    isTerminalFailure: true,
                },
            ],
        },
    ],
};

const PRODUCT_TEMPLATE: GlobalEntityTemplateSeed = {
    code: "product",
    name: "Product",
    fields: [],
    statusSets: [],
    stageCategories: [],
};

export const GLOBAL_ENTITY_TEMPLATE_SEEDS: GlobalEntityTemplateSeed[] = [
    MEMBER_TEMPLATE,
    EMPLOYEE_TEMPLATE,
    ORDER_TEMPLATE,
    PRODUCT_TEMPLATE,
];

/**
 * Идемпотентно создаёт глобальные шаблоны сущностей платформы.
 * Вызывается из prisma seed и из рантайм-провижининга портала.
 */
export async function ensureGlobalEntityTemplates(db: Db): Promise<void> {
    const portalTypesJson = ALL_PORTAL_TYPES as unknown as Prisma.InputJsonValue;

    const existingCodes = new Set(
        (
            await db.globalEntityTemplate.findMany({
                where: { code: { in: GLOBAL_ENTITY_TEMPLATE_SEEDS.map((s) => s.code) } },
                select: { code: true },
            })
        ).map((t) => t.code)
    );

    for (const seed of GLOBAL_ENTITY_TEMPLATE_SEEDS) {
        if (existingCodes.has(seed.code)) {
            continue;
        }

        await db.globalEntityTemplate.create({
            data: {
                code: seed.code,
                name: seed.name,
                applicablePortalTypes: portalTypesJson,
                modulesJson: ["crm"] as unknown as Prisma.InputJsonValue,
                fieldTemplates: {
                    create: seed.fields.map((f) => ({
                        fieldKey: f.fieldKey,
                        type: f.type,
                        label: f.label,
                        isSystem: true,
                        isImmutable: true,
                        deletableByPortal: false,
                        customizableByPortal: true,
                        isMultiple: f.isMultiple ?? false,
                        sortOrder: f.sortOrder,
                        showInFilters: f.showInFilters ?? false,
                        documentType: f.documentType ?? null,
                        ...(f.requiredInPurposes
                            ? {
                                  validationJson: {
                                      requiredInPurposes: f.requiredInPurposes,
                                  } as Prisma.InputJsonValue,
                              }
                            : {}),
                        ...(f.options
                            ? {
                                  options: {
                                      create: f.options.map((o) => ({
                                          valueKey: o.valueKey,
                                          label: o.label,
                                          sortOrder: o.sortOrder,
                                          color: o.color ?? null,
                                      })),
                                  },
                              }
                            : {}),
                    })),
                },
                statusSetTemplates: {
                    create: seed.statusSets.map((s) => ({
                        code: s.code,
                        isSystem: true,
                        isImmutable: true,
                        items: {
                            create: s.items.map((i) => ({
                                key: i.key,
                                label: i.label,
                                color: i.color,
                                sortOrder: i.sortOrder,
                                isSystem: true,
                            })),
                        },
                    })),
                },
                stageCategoryTemplates: {
                    create: seed.stageCategories.map((c) => ({
                        code: c.code,
                        name: c.name,
                        isDefault: true,
                        isSystem: true,
                        hiddenInUi: false,
                        stages: {
                            create: c.stages.map((s) => ({
                                name: s.name,
                                sortOrder: s.sortOrder,
                                color: s.color,
                                semantic: s.semantic,
                                isTerminalSuccess: s.isTerminalSuccess,
                                isTerminalFailure: s.isTerminalFailure,
                            })),
                        },
                    })),
                },
            },
        });
    }
}
