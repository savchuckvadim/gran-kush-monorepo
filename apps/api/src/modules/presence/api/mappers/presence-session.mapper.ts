import { PresenceSessionDto } from "@presence/api/dto/presence.dto";
import { PresenceSession } from "@presence/domain/entity/presence-session.entity";

/**
 * Маппинг PresenceSession entity → PresenceSessionDto
 * Используется и в CRM, и в LK контроллерах.
 */
export function mapPresenceSessionToDto(s: PresenceSession): PresenceSessionDto {
    return {
        id: s.id,
        memberId: s.memberId,
        isActive: s.isActive(),
        entryMethod: s.entryMethod,
        exitMethod: s.exitMethod,
        enteredAt: s.enteredAt.toISOString(),
        exitedAt: s.exitedAt?.toISOString() ?? null,
        durationMinutes: s.getDurationMinutes(),
        member: s.member,
        employee: s.employee ?? null,
        createdAt: s.createdAt.toISOString(),
    };
}
