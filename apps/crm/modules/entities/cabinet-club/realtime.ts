import { cabinetKeys } from "@/modules/entities/cabinet-account";
import type { RealtimeRule } from "@/modules/shared/realtime";

/**
 * Вход и выход, статус и карточка участника меняют всё в разделе клуба: «вы в клубе», визиты,
 * QR и доступ к магазину. Клуб — тот, к которому открыто соединение.
 */
export const cabinetClubRealtimeRules: readonly RealtimeRule[] = [
    {
        events: ["presence.entered", "presence.left", "member.status_changed", "member.updated"],
        keys: (_event, { portal }) => (portal ? [cabinetKeys.club(portal)] : []),
    },
];
