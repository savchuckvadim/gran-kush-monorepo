import { Injectable } from "@nestjs/common";

import {
    type DomainEvent,
    EVENT_NAMES,
    findEventDefinition,
    publicPayloadOf,
} from "@workspace/domain-events";

import { OnDomainEvent } from "@modules/events";

import { eventTargets, REALTIME_ROOMS } from "../domain/realtime-rooms";

import { RealtimeHubService } from "./realtime-hub.service";

/**
 * Потребитель шины: отправляет событие в комнаты его аудитории (каталог `audience`) и разрывает
 * соединения, права которых изменились. Сотрудники получают конверт целиком, участник и аккаунт —
 * только `publicPayload`. Повтор доставки отправит событие ещё раз: клиент лишь перечитает данные.
 */
@Injectable()
export class RealtimeConsumer {
    constructor(private readonly hub: RealtimeHubService) {}

    @OnDomainEvent(...EVENT_NAMES)
    onEvent(event: DomainEvent): void {
        const definition = findEventDefinition(event.name);
        if (!definition) return;

        for (const target of eventTargets(event, definition)) {
            const message =
                target.view === "full" ? event : { ...event, payload: publicPayloadOf(event) };
            this.hub.emit(target.audience, target.rooms, message);
        }
        this.applyAccessChange(event);
    }

    /** Отозванная сессия, снятые права, выход из клуба — соединение больше не должно слушать. */
    private applyAccessChange(event: DomainEvent): void {
        const portalId = event.portalId;
        switch (event.name) {
            case "session.revoked":
                this.hub.disconnect(
                    event.payload.audience,
                    REALTIME_ROOMS.session(event.payload.sessionId)
                );
                return;
            case "employee.access_changed":
                if (portalId) {
                    this.hub.disconnect(
                        "crm",
                        REALTIME_ROOMS.employee(portalId, event.payload.employeeId)
                    );
                }
                return;
            case "role.changed":
                if (portalId && event.payload.changed.includes("permissions")) {
                    this.hub.disconnect("crm", REALTIME_ROOMS.role(portalId, event.payload.roleId));
                }
                return;
            case "member.left":
                if (portalId) {
                    this.hub.disconnect(
                        "cabinet",
                        REALTIME_ROOMS.member(portalId, event.payload.memberId)
                    );
                }
                return;
            case "member.updated":
                if (portalId && event.payload.changed.includes("isActive")) {
                    this.hub.disconnect(
                        "cabinet",
                        REALTIME_ROOMS.member(portalId, event.payload.memberId)
                    );
                }
                return;
            default:
                return;
        }
    }
}
