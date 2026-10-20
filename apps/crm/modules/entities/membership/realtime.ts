import { cabinetKeys } from "@/modules/entities/cabinet-account";
import type { RealtimeRule } from "@/modules/shared/realtime";

/** Клуб завёл членство, человек согласился или вышел: «мои клубы» и профиль кабинета. */
export const membershipRealtimeRules: readonly RealtimeRule[] = [
    {
        events: [
            "member.joined",
            "member.consent_given",
            "member.left",
            "member.status_changed",
            "member.updated",
        ],
        keys: () => [cabinetKeys.memberships, cabinetKeys.me],
    },
];
