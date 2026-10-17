/**
 * Каталог прав сотрудника в клубе (TASK-730). Роль хранит список этих кодов; право — минимальное
 * действие, которое клуб может дать или отнять. Код живёт в БД ролей, поэтому переименование кода —
 * миграция данных, а не правка строки.
 */
export const PERMISSIONS = {
    MembersRead: "members.read",
    MembersCreate: "members.create",
    MembersEdit: "members.edit",
    /** Сканы документов и подпись участника, показанные клубу */
    MembersDocuments: "members.documents",
    /** Ссылки регистрации участников */
    MembersInvite: "members.invite",

    OrdersRead: "orders.read",
    OrdersCreate: "orders.create",
    /** Стадии, статус и оплата заказа, стадия при создании */
    OrdersProcess: "orders.process",

    /** Товары, категории, единицы измерения. Читать каталог может любой сотрудник */
    CatalogManage: "catalog.manage",

    FinanceRead: "finance.read",
    FinanceWrite: "finance.write",

    PresenceRead: "presence.read",
    /** Скан QR на входе, ручной вход и выход */
    PresenceCheckin: "presence.checkin",
    /** Выпуск и отзыв QR участника */
    QrManage: "qr.manage",

    RecordsRead: "records.read",
    RecordsWrite: "records.write",
    RecordsDelete: "records.delete",

    EmployeesRead: "employees.read",
    /** Добавить, изменить, отключить сотрудника, приглашения */
    EmployeesManage: "employees.manage",
    RolesManage: "roles.manage",

    /** Правила клуба, присутствие, оформление, публичная страница, общие настройки интерфейса */
    SettingsClub: "settings.club",
    /** Сущности, поля, формы, воронки, статусы */
    SettingsStructure: "settings.structure",
    /** Общие для клуба виды списков и канбана (колонки, порядок) поверх личных */
    SettingsViews: "settings.views",
    BillingManage: "billing.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Разделы для экрана «Роли и права»: порядок групп и прав в них — порядок на экране. */
export const PERMISSION_GROUPS: readonly { key: string; permissions: readonly Permission[] }[] = [
    {
        key: "members",
        permissions: [
            PERMISSIONS.MembersRead,
            PERMISSIONS.MembersCreate,
            PERMISSIONS.MembersEdit,
            PERMISSIONS.MembersDocuments,
            PERMISSIONS.MembersInvite,
        ],
    },
    {
        key: "orders",
        permissions: [PERMISSIONS.OrdersRead, PERMISSIONS.OrdersCreate, PERMISSIONS.OrdersProcess],
    },
    { key: "catalog", permissions: [PERMISSIONS.CatalogManage] },
    { key: "finance", permissions: [PERMISSIONS.FinanceRead, PERMISSIONS.FinanceWrite] },
    {
        key: "presence",
        permissions: [PERMISSIONS.PresenceRead, PERMISSIONS.PresenceCheckin, PERMISSIONS.QrManage],
    },
    {
        key: "records",
        permissions: [PERMISSIONS.RecordsRead, PERMISSIONS.RecordsWrite, PERMISSIONS.RecordsDelete],
    },
    {
        key: "team",
        permissions: [
            PERMISSIONS.EmployeesRead,
            PERMISSIONS.EmployeesManage,
            PERMISSIONS.RolesManage,
        ],
    },
    {
        key: "club",
        permissions: [
            PERMISSIONS.SettingsClub,
            PERMISSIONS.SettingsStructure,
            PERMISSIONS.SettingsViews,
            PERMISSIONS.BillingManage,
        ],
    },
];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);

const KNOWN = new Set<string>(ALL_PERMISSIONS);

export const isPermission = (code: string): code is Permission => KNOWN.has(code);
