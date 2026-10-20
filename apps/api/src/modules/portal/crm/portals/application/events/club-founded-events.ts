import { type NewDomainEvent, userActor } from "@modules/events";

import type { CreateClubDto } from "../../api/dto/create-club.dto";
import type { FoundedClub } from "../services/club-founding.service";

/**
 * Клуб основан: `portal.founded` (приветственное письмо, алерт платформе) и вступление владельца
 * в команду. Пишутся в транзакции основания — клуба без события и события без клуба не бывает.
 */
export const clubFoundedEvents = (club: FoundedClub, dto: CreateClubDto): NewDomainEvent[] => {
    const actor = userActor(club.owner.userId);
    return [
        {
            name: "portal.founded",
            portalId: club.portal.id,
            actor,
            aggregateId: club.portal.id,
            payload: {
                portalSlug: club.portal.name,
                portalDisplayName: club.portal.displayName,
                ownerUserId: club.owner.userId,
                ownerEmployeeId: club.owner.id,
                ownerName: dto.ownerName.trim(),
                language: dto.locale,
            },
        },
        {
            name: "employee.joined",
            portalId: club.portal.id,
            actor,
            aggregateId: club.owner.id,
            payload: {
                employeeId: club.owner.id,
                userId: club.owner.userId,
                roleId: club.owner.roleId,
            },
        },
    ];
};
