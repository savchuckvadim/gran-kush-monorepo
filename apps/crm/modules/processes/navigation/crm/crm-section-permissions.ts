import { type Permission, SETTINGS_PERMISSIONS } from "@/modules/entities/access";
import { ROUTES } from "@/modules/shared/config/routes";

/**
 * Права разделов CRM по адресу (без локали и клуба). Ищется первый подходящий префикс, поэтому
 * частные разделы стоят раньше общих. `anyOf: null` — раздел открыт любому сотруднику клуба.
 * Те же права проверяет API; таблица лишь показывает «Нет доступа» вместо страницы с ошибками.
 */
export const CRM_SECTION_PERMISSIONS: readonly {
    prefix: string;
    anyOf: readonly Permission[] | null;
}[] = [
    // лента — всему персоналу; что в ней видно, решают права каждого события
    { prefix: ROUTES.CRM_FEED, anyOf: null },
    { prefix: ROUTES.CRM_MEMBER_BASE, anyOf: ["members.read"] },
    { prefix: ROUTES.CRM_ORDER_NEW, anyOf: ["orders.create"] },
    { prefix: ROUTES.CRM_ORDER_BASE, anyOf: ["orders.read"] },
    { prefix: ROUTES.CRM_ATTENDANCE, anyOf: ["presence.read", "presence.checkin"] },
    { prefix: ROUTES.CRM_FINANCE, anyOf: ["finance.read"] },
    { prefix: ROUTES.CRM_EMPLOYEES, anyOf: ["employees.read"] },
    { prefix: ROUTES.CRM_ENTITIES, anyOf: ["records.read"] },
    { prefix: ROUTES.CRM_SETTINGS_INVITATIONS, anyOf: ["employees.manage"] },
    { prefix: ROUTES.CRM_SETTINGS_REGISTRATION_LINKS, anyOf: ["members.invite"] },
    { prefix: ROUTES.CRM_SETTINGS_BILLING, anyOf: ["billing.manage"] },
    { prefix: ROUTES.CRM_SETTINGS_ROLES, anyOf: ["roles.manage", "employees.read"] },
    // личное оформление — у каждого; тему клуба на этой странице меняет только settings.club
    { prefix: ROUTES.CRM_SETTINGS_APPEARANCE, anyOf: null },
    { prefix: ROUTES.CRM_SETTINGS, anyOf: SETTINGS_PERMISSIONS },
];
