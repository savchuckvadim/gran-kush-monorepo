import type { AnyEventDefinition, DomainEventEnvelope } from "@workspace/domain-events";

import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import type { RealtimeConnection } from "./realtime-connection";

/*
 * Комнаты realtime. Все комнаты клуба начинаются с `portal:<id>:` — событие одного клуба не
 * может попасть в комнату другого, потому что адрес комнаты строится из `event.portalId`.
 */
export const REALTIME_ROOMS = {
    user: (userId: string) => `user:${userId}`,
    session: (sessionId: string) => `session:${sessionId}`,
    staff: (portalId: string) => `portal:${portalId}:staff`,
    permission: (portalId: string, permission: string) =>
        `portal:${portalId}:permission:${permission}`,
    employee: (portalId: string, employeeId: string) => `portal:${portalId}:employee:${employeeId}`,
    role: (portalId: string, roleId: string) => `portal:${portalId}:role:${roleId}`,
    members: (portalId: string) => `portal:${portalId}:members`,
    member: (portalId: string, memberId: string) => `portal:${portalId}:member:${memberId}`,
} as const;

/** Комнаты соединения: аккаунт и сессия всегда, клуб — по роли в нём. */
export const connectionRooms = (connection: RealtimeConnection): string[] => {
    const rooms = [
        REALTIME_ROOMS.user(connection.userId),
        REALTIME_ROOMS.session(connection.sessionId),
    ];
    const portal = connection.portal;
    if (!portal) return rooms;
    if (portal.kind === "member") {
        rooms.push(
            REALTIME_ROOMS.members(portal.portalId),
            REALTIME_ROOMS.member(portal.portalId, portal.memberId)
        );
        return rooms;
    }
    rooms.push(
        REALTIME_ROOMS.staff(portal.portalId),
        REALTIME_ROOMS.employee(portal.portalId, portal.employeeId),
        REALTIME_ROOMS.role(portal.portalId, portal.roleId),
        ...portal.permissions.map((code) => REALTIME_ROOMS.permission(portal.portalId, code))
    );
    return rooms;
};

/** Сотрудник видит событие целиком, участник и аккаунт — только публичные поля. */
export type RealtimeView = "full" | "public";

export interface RealtimeTarget {
    audience: SessionAudience;
    view: RealtimeView;
    rooms: string[];
}

const stringField = (payload: unknown, key: string): string | null => {
    const value = (payload as Record<string, unknown> | null)?.[key];
    return typeof value === "string" && value.length > 0 ? value : null;
};

/**
 * Куда отправить событие по его аудитории в каталоге. Цели сгруппированы по неймспейсу и виду:
 * одна отправка на группу, и socket.io не доставит событие дважды сокету из двух комнат группы.
 */
export const eventTargets = (
    event: DomainEventEnvelope,
    definition: AnyEventDefinition
): RealtimeTarget[] => {
    const { audience } = definition;
    const portalId = event.portalId;
    if (definition.scope === "portal" && !portalId) return [];

    const groups = new Map<string, RealtimeTarget>();
    const add = (target: Omit<RealtimeTarget, "rooms">, room: string) => {
        const key = `${target.audience}:${target.view}`;
        const group = groups.get(key) ?? { ...target, rooms: [] };
        if (!group.rooms.includes(room)) group.rooms.push(room);
        groups.set(key, group);
    };

    if (portalId && audience.staff) {
        const permission = audience.staff.permission;
        add(
            { audience: "crm", view: "full" },
            permission
                ? REALTIME_ROOMS.permission(portalId, permission)
                : REALTIME_ROOMS.staff(portalId)
        );
    }
    if (portalId && audience.member) {
        const memberId = stringField(event.payload, audience.member.by);
        if (memberId) {
            add({ audience: "cabinet", view: "public" }, REALTIME_ROOMS.member(portalId, memberId));
        }
    }
    if (portalId && audience.members) {
        add({ audience: "cabinet", view: "public" }, REALTIME_ROOMS.members(portalId));
    }
    if (audience.user) {
        const userId = stringField(event.payload, audience.user.by);
        if (userId) {
            add({ audience: "crm", view: "public" }, REALTIME_ROOMS.user(userId));
            add({ audience: "cabinet", view: "public" }, REALTIME_ROOMS.user(userId));
        }
    }
    return [...groups.values()];
};
