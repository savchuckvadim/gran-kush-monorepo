import type { PortalRequestContext } from "../common/portal/portal-context.types";

declare global {
    namespace Express {
        interface Request {
            /** Заполняется PortalContextMiddleware для маршрутов CRM/LK/Users. */
            portalContext?: PortalRequestContext;
            /** Passport (Employee / Member / User). */
            user?: unknown;
        }
    }
}

export {};
