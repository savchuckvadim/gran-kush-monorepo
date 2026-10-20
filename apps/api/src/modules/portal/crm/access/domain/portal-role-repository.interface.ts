import type { NewDomainEvent } from "@modules/events";

import type { PortalRole } from "./portal-role";

export interface PortalRoleWithUsage extends PortalRole {
    /** Активные и отключённые сотрудники с этой ролью */
    employeeCount: number;
}

export abstract class PortalRoleRepository {
    abstract findAllByPortal(portalId: string): Promise<PortalRoleWithUsage[]>;
    abstract findById(id: string, portalId: string): Promise<PortalRole | null>;
    abstract findWithUsage(id: string, portalId: string): Promise<PortalRoleWithUsage | null>;
    abstract findByKey(portalId: string, key: string): Promise<PortalRole | null>;
    abstract create(
        portalId: string,
        data: { key: string; name: string; permissions: string[] }
    ): Promise<PortalRole>;
    /** `events` пишутся в outbox той же транзакцией, что и роль (TASK-780). */
    abstract update(
        id: string,
        data: Partial<{ name: string; permissions: string[] }>,
        events?: readonly NewDomainEvent[]
    ): Promise<PortalRole>;
    /** Роль, назначенная сотрудникам или ждущему приглашению, не удаляется: `false`. */
    abstract deleteUnused(id: string, portalId: string): Promise<boolean>;
}
