import { UnauthorizedException } from "@nestjs/common";

/**
 * Инварианты tenant: нельзя выдавать JWT/операции без привязки к порталу.
 * Это не HTTP-Guard (он работает на уровне запроса); вызывается из сервисов и при необходимости из контроллеров.
 */

export function requireEmployeePortalId(employee: { portalId?: string | null }): string {
    if (!employee.portalId) {
        throw new UnauthorizedException("Employee is not bound to a portal");
    }
    return employee.portalId;
}

export function requireMemberPortalId(member: { portalId?: string | null }): string {
    if (!member.portalId) {
        throw new UnauthorizedException("Member is not bound to a portal");
    }
    return member.portalId;
}
