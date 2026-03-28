/** Контекст текущего портала (tenant) для HTTP-запроса. */
export interface PortalRequestContext {
    portalId: string;
    /** Уникальный slug в БД (`Portal.name`). */
    slug: string;
    displayName: string;
}
