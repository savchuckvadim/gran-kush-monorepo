import { useQuery } from "@tanstack/react-query";

import { getMyPortals } from "../api";

export const myPortalsKey = ["crm-my-portals"] as const;

/** Клубы сотрудника; `enabled` — спрашивать только когда список нужен (меню открыто). */
export function useMyPortals(enabled: boolean) {
    return useQuery({ queryKey: myPortalsKey, queryFn: getMyPortals, enabled });
}
