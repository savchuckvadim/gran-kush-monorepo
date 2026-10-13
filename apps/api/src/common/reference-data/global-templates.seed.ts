import { PortalFieldType, PortalTypeEnum, Prisma, StageSemantic } from "@prisma/client";

import type { LabelTranslations } from "../i18n/content-locale";

type Db = Prisma.TransactionClient;

const ALL_PORTAL_TYPES: PortalTypeEnum[] = [
    PortalTypeEnum.CLUB,
    PortalTypeEnum.TATTOO_STUDIO,
    PortalTypeEnum.BEAUTY_STUDIO,
];

export interface GlobalFieldSeed {
    fieldKey: string;
    type: PortalFieldType;
    /** Базовая подпись в БД — `labelI18n.en`. */
    labelI18n: LabelTranslations;
    sortOrder: number;
    showInFilters?: boolean;
    isMultiple?: boolean;
    documentType?: string;
    /** validationJson.requiredInPurposes управляет FormDefinitionItem.required при провижининге */
    requiredInPurposes?: string[];
    options?: { valueKey: string; label: string; sortOrder: number; color?: string }[];
}

export interface GlobalStatusItemSeed {
    key: string;
    /** Базовая подпись в БД — `labelI18n.en`. */
    labelI18n: LabelTranslations;
    color: string | null;
    sortOrder: number;
}

export interface GlobalStatusSetSeed {
    code: string;
    items: GlobalStatusItemSeed[];
}

export interface GlobalStageSeed {
    /** Базовое название в БД — `nameI18n.en`. */
    nameI18n: LabelTranslations;
    sortOrder: number;
    color: string | null;
    semantic: StageSemantic;
    isTerminalSuccess: boolean;
    isTerminalFailure: boolean;
}

export interface GlobalStageCategorySeed {
    code: string;
    name: string;
    stages: GlobalStageSeed[];
}

export interface GlobalEntityTemplateSeed {
    code: string;
    name: string;
    fields: GlobalFieldSeed[];
    statusSets: GlobalStatusSetSeed[];
    stageCategories: GlobalStageCategorySeed[];
}

const FIRST_NAME: LabelTranslations = { es: "Nombre", ru: "Имя", en: "First name" };
const LAST_NAME: LabelTranslations = { es: "Apellidos", ru: "Фамилия", en: "Last name" };
const PHONE: LabelTranslations = { es: "Teléfono", ru: "Телефон", en: "Phone" };

const MEMBER_TEMPLATE: GlobalEntityTemplateSeed = {
    code: "member",
    name: "Member",
    fields: [
        {
            fieldKey: "first_name",
            type: PortalFieldType.string,
            labelI18n: FIRST_NAME,
            sortOrder: 0,
            showInFilters: true,
            requiredInPurposes: ["public_registration", "crm_create"],
        },
        { fieldKey: "last_name", type: PortalFieldType.string, labelI18n: LAST_NAME, sortOrder: 1 },
        {
            fieldKey: "phone",
            type: PortalFieldType.phone,
            labelI18n: PHONE,
            sortOrder: 2,
            showInFilters: true,
        },
        {
            fieldKey: "birthday",
            type: PortalFieldType.date,
            labelI18n: { es: "Fecha de nacimiento", ru: "Дата рождения", en: "Birthday" },
            sortOrder: 3,
        },
        {
            fieldKey: "address",
            type: PortalFieldType.text,
            labelI18n: { es: "Dirección", ru: "Адрес", en: "Address" },
            sortOrder: 4,
        },
        {
            fieldKey: "notes",
            type: PortalFieldType.text,
            labelI18n: { es: "Notas", ru: "Заметки", en: "Notes" },
            sortOrder: 5,
        },
        {
            fieldKey: "is_medical",
            type: PortalFieldType.boolean,
            labelI18n: { es: "Uso medicinal", ru: "Медицинское", en: "Medical use" },
            sortOrder: 6,
        },
        {
            fieldKey: "is_mj",
            type: PortalFieldType.boolean,
            labelI18n: { es: "MJ", ru: "MJ", en: "MJ" },
            sortOrder: 7,
        },
        {
            fieldKey: "is_recreation",
            type: PortalFieldType.boolean,
            labelI18n: { es: "Uso recreativo", ru: "Рекреационное", en: "Recreation" },
            sortOrder: 8,
        },
        {
            fieldKey: "identity_document",
            type: PortalFieldType.document,
            labelI18n: {
                es: "Documento de identidad",
                ru: "Документ, удостоверяющий личность",
                en: "Identity document",
            },
            sortOrder: 9,
            documentType: "identity",
        },
        {
            fieldKey: "signature",
            type: PortalFieldType.signature,
            labelI18n: { es: "Firma", ru: "Подпись", en: "Signature" },
            sortOrder: 10,
        },
    ],
    statusSets: [
        {
            code: "member_lifecycle",
            items: [
                {
                    key: "inProgress",
                    labelI18n: { es: "En curso", ru: "В работе", en: "In progress" },
                    color: "#64748b",
                    sortOrder: 0,
                },
                {
                    key: "pending",
                    labelI18n: { es: "Pendiente", ru: "На рассмотрении", en: "Pending" },
                    color: "#ca8a04",
                    sortOrder: 1,
                },
                {
                    key: "approved",
                    labelI18n: { es: "Aprobado", ru: "Одобрен", en: "Approved" },
                    color: "#16a34a",
                    sortOrder: 2,
                },
                {
                    key: "rejected",
                    labelI18n: { es: "Rechazado", ru: "Отклонён", en: "Rejected" },
                    color: "#dc2626",
                    sortOrder: 3,
                },
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
            labelI18n: FIRST_NAME,
            sortOrder: 0,
            showInFilters: true,
            requiredInPurposes: ["crm_create"],
        },
        { fieldKey: "last_name", type: PortalFieldType.string, labelI18n: LAST_NAME, sortOrder: 1 },
        { fieldKey: "phone", type: PortalFieldType.phone, labelI18n: PHONE, sortOrder: 2 },
        {
            fieldKey: "position",
            type: PortalFieldType.string,
            labelI18n: { es: "Cargo", ru: "Должность", en: "Position" },
            sortOrder: 3,
        },
        {
            fieldKey: "department",
            type: PortalFieldType.string,
            labelI18n: { es: "Departamento", ru: "Отдел", en: "Department" },
            sortOrder: 4,
        },
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
                    nameI18n: { es: "Pendiente", ru: "Ожидает", en: "Pending" },
                    sortOrder: 0,
                    color: "#64748b",
                    semantic: StageSemantic.NEW,
                    isTerminalSuccess: false,
                    isTerminalFailure: false,
                },
                {
                    nameI18n: { es: "Confirmado", ru: "Подтверждён", en: "Confirmed" },
                    sortOrder: 1,
                    color: "#2563eb",
                    semantic: StageSemantic.IN_PROGRESS,
                    isTerminalSuccess: false,
                    isTerminalFailure: false,
                },
                {
                    nameI18n: { es: "Preparando", ru: "Готовится", en: "Preparing" },
                    sortOrder: 2,
                    color: "#7c3aed",
                    semantic: StageSemantic.IN_PROGRESS,
                    isTerminalSuccess: false,
                    isTerminalFailure: false,
                },
                {
                    nameI18n: { es: "Listo", ru: "Готов", en: "Ready" },
                    sortOrder: 3,
                    color: "#ca8a04",
                    semantic: StageSemantic.IN_PROGRESS,
                    isTerminalSuccess: false,
                    isTerminalFailure: false,
                },
                {
                    nameI18n: { es: "Completado", ru: "Завершён", en: "Completed" },
                    sortOrder: 4,
                    color: "#16a34a",
                    semantic: StageSemantic.SUCCESS,
                    isTerminalSuccess: true,
                    isTerminalFailure: false,
                },
                {
                    nameI18n: { es: "Cancelado", ru: "Отменён", en: "Cancelled" },
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
                        label: f.labelI18n.en,
                        labelI18n: f.labelI18n,
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
                                label: i.labelI18n.en,
                                labelI18n: i.labelI18n,
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
                                name: s.nameI18n.en,
                                nameI18n: s.nameI18n,
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
