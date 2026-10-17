/**
 * Application routes constants
 * Centralized location for all route paths
 */

export const ROUTES = {
    HOME: "/",
    PROFILE: "/profile",
    PROFILE_SETTINGS: "/profile/settings",
    /** Ссылка из письма: `${ROUTES.CONFIRM_EMAIL}/${token}` */
    CONFIRM_EMAIL: "/auth/confirm",
    FORGOT_PASSWORD: "/auth/forgot-password",
    /** Ссылка из письма: `?token=` */
    RESET_PASSWORD: "/auth/reset-password",
    /** Приглашение сотрудника (вне клуба): `${ROUTES.INVITE}/${token}` */
    INVITE: "/auth/invite",
    CRM_HOME: "/crm",
    /** Префикс раздела клиентов: list, details, new */
    CRM_MEMBER_BASE: "/crm/member",
    /** Список клиентов (member/list) */
    CRM_MEMBERS: "/crm/member/list",
    /** Префикс карточки клиента: `${ROUTES.CRM_MEMBER_DETAILS}/${id}` */
    CRM_MEMBER_DETAILS: "/crm/member/details",
    CRM_MEMBER_NEW: "/crm/member/new",
    /** Лист с QR участника для печати, вне оболочки CRM: `${ROUTES.PRINT_MEMBER_QR}/${memberId}` */
    PRINT_MEMBER_QR: "/print/member-qr",
    CRM_PRODUCT_BASE: "/crm/product",
    /** Список товаров */
    CRM_PRODUCTS: "/crm/product/list",
    CRM_PRODUCT_DETAILS: "/crm/product/details",
    CRM_ORDER_BASE: "/crm/order",
    /** Список заказов */
    CRM_ORDERS: "/crm/order/list",
    CRM_ORDER_DETAILS: "/crm/order/details",
    /** Новый заказ; `?memberId=` подставляет участника */
    CRM_ORDER_NEW: "/crm/order/new",
    CRM_ATTENDANCE: "/crm/attendance",
    CRM_FINANCE: "/crm/finance",
    CRM_EMPLOYEES: "/crm/employees",
    /** Префикс карточки сотрудника: `${ROUTES.CRM_EMPLOYEE_DETAILS}/${id}` */
    CRM_EMPLOYEE_DETAILS: "/crm/employees",
    CRM_PROFILE: "/crm/profile",
    CRM_SETTINGS: "/crm/settings",
    /** Конструктор сущностей (поля/формы/стадии) */
    CRM_SETTINGS_ENTITIES: "/crm/settings/entities",
    /** Инвайты сотрудников */
    CRM_SETTINGS_INVITATIONS: "/crm/settings/invitations",
    /** Роли клуба и права (TASK-732) */
    CRM_SETTINGS_ROLES: "/crm/settings/roles",
    /** Ссылки-формы регистрации */
    CRM_SETTINGS_REGISTRATION_LINKS: "/crm/settings/registration-links",
    /** Подписка клуба: тариф, оплата, кабинет Stripe. Открыта и при 402 */
    CRM_SETTINGS_BILLING: "/crm/settings/billing",
    /** Правила клуба для участников: вступление, каталог вне клуба, одобрение, заказ на себя */
    CRM_SETTINGS_CLUB_POLICY: "/crm/settings/club-policy",
    /** Присутствие: часовой пояс клуба, авто-выход забытых визитов, потолок длительности */
    CRM_SETTINGS_PRESENCE: "/crm/settings/presence",
    /** Оформление: темы, светлый/тёмный режим, энергосбережение */
    CRM_SETTINGS_APPEARANCE: "/crm/settings/appearance",
    /** Записи смарт-процессов: `${ROUTES.CRM_ENTITIES}/${code}` */
    CRM_ENTITIES: "/crm/entities",
    LOGIN: "/auth/login",
    /** Новый клуб для вошедшего аккаунта (вне клуба: `/{locale}/clubs/new`); `?plan=` с сайта сохраняется */
    NEW_CLUB: "/clubs/new",
    /** «Вход и безопасность» аккаунта (вне клуба); сюда же API возвращает после привязки Google */
    ACCOUNT_SECURITY: "/account/security",
    REGISTER: "/auth/register",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
