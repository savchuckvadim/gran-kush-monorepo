import type { PortalTypeEnum } from "@prisma/client";

import type { NewDomainEvent } from "@modules/events";

import type {
    OrganizationIdentity,
    OrganizationProfile,
    OrganizationTaxSettings,
} from "../organization/organization-profile";

/** Профиль организации портала; реквизиты шифрует и расшифровывает реализация. */
export abstract class OrganizationProfileRepository {
    abstract portalType(portalId: string): Promise<PortalTypeEnum | null>;

    abstract find(portalId: string): Promise<OrganizationProfile | null>;

    /** Только налоговые настройки, без расшифровки реквизитов (для заказов и ставок). */
    abstract findTaxSettings(portalId: string): Promise<OrganizationTaxSettings | null>;

    /** Создать или заменить профиль; `events` — в той же транзакции. */
    abstract save(
        portalId: string,
        profile: OrganizationTaxSettings & { identity: OrganizationIdentity },
        employeeId: string,
        events: readonly NewDomainEvent[]
    ): Promise<OrganizationProfile>;
}
