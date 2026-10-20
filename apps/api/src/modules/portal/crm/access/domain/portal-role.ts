import { ALL_PERMISSIONS, isPermission, Permission, PERMISSIONS } from "./permissions";

/** Ключи системных ролей. Своя роль клуба получает ключ `custom_…`. */
export const SYSTEM_ROLE_KEYS = {
    Owner: "owner",
    Admin: "admin",
    Manager: "manager",
    Employee: "employee",
} as const;

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[keyof typeof SYSTEM_ROLE_KEYS];

/**
 * Владелец и админ видят и могут всё. Их права не хранятся, а вычисляются из каталога: новое право
 * сразу есть у них, и клуб не может случайно запереть себя, сняв галочку.
 */
const FULL_ACCESS_ROLE_KEYS: ReadonlySet<string> = new Set([
    SYSTEM_ROLE_KEYS.Owner,
    SYSTEM_ROLE_KEYS.Admin,
]);

/**
 * Менеджер по умолчанию — прежние границы роли: ведёт участников, заказы, присутствие и записи, но не
 * правит каталог, ссылки регистрации, финансы, команду и настройки клуба и не удаляет записи.
 */
const MANAGER_EXCLUDED: ReadonlySet<Permission> = new Set([
    PERMISSIONS.MembersInvite,
    PERMISSIONS.CatalogManage,
    PERMISSIONS.RecordsDelete,
    PERMISSIONS.FinanceWrite,
    PERMISSIONS.FinanceAdmin,
    PERMISSIONS.EmployeesManage,
    PERMISSIONS.RolesManage,
    PERMISSIONS.SettingsClub,
    PERMISSIONS.SettingsStructure,
    PERMISSIONS.BillingManage,
]);

/**
 * Наборы по умолчанию для редактируемых системных ролей. Сотруднику по умолчанию закрыты финансы,
 * сканы документов, список команды и QR (аудит TASK-678).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<"manager" | "employee", readonly Permission[]> = {
    manager: ALL_PERMISSIONS.filter((code) => !MANAGER_EXCLUDED.has(code)),
    employee: [
        PERMISSIONS.MembersRead,
        PERMISSIONS.MembersCreate,
        PERMISSIONS.OrdersRead,
        PERMISSIONS.OrdersCreate,
        PERMISSIONS.PresenceRead,
        PERMISSIONS.PresenceCheckin,
        PERMISSIONS.RecordsRead,
    ],
};

/** Системные роли в порядке «от широкой к узкой» — так их и показывает экран ролей. */
export const SYSTEM_ROLES: readonly { key: SystemRoleKey; permissions: readonly Permission[] }[] = [
    { key: SYSTEM_ROLE_KEYS.Owner, permissions: [] },
    { key: SYSTEM_ROLE_KEYS.Admin, permissions: [] },
    { key: SYSTEM_ROLE_KEYS.Manager, permissions: DEFAULT_ROLE_PERMISSIONS.manager },
    { key: SYSTEM_ROLE_KEYS.Employee, permissions: DEFAULT_ROLE_PERMISSIONS.employee },
];

export interface PortalRole {
    id: string;
    portalId: string;
    key: string;
    /** Название своей роли; у системных — null, название даёт перевод по ключу */
    name: string | null;
    isSystem: boolean;
    permissions: string[];
}

export const isFullAccessRole = (role: Pick<PortalRole, "key" | "isSystem">): boolean =>
    role.isSystem && FULL_ACCESS_ROLE_KEYS.has(role.key);

export const isOwnerRole = (role: Pick<PortalRole, "key" | "isSystem">): boolean =>
    role.isSystem && role.key === SYSTEM_ROLE_KEYS.Owner;

/** Права роли: полный каталог для владельца и админа, иначе сохранённые коды, известные каталогу. */
export const effectivePermissions = (
    role: Pick<PortalRole, "key" | "isSystem" | "permissions">
): Permission[] =>
    isFullAccessRole(role) ? [...ALL_PERMISSIONS] : role.permissions.filter(isPermission);

/** Права роли редактируются у всех, кроме владельца и админа. */
export const isEditableRole = (role: Pick<PortalRole, "key" | "isSystem">): boolean =>
    !isFullAccessRole(role);
