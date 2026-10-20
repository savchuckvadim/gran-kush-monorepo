"use client";

import { usePathname } from "next/navigation";

import { refreshCabinetSession } from "@/modules/shared/api/session-refresh";
import { getClubSlugFromPath } from "@/modules/shared/config/club-routes";
import { RealtimeProvider } from "@/modules/shared/realtime";

import { CABINET_REALTIME_RULES } from "./realtime-rules";

/**
 * Живые данные кабинета. В разделе клуба (`/{язык}/{клуб}/…`) соединение открыто к клубу, на
 * страницах аккаунта — без клуба: приходят только события самого человека (мои клубы, сессии).
 */
export function CabinetRealtime({ children }: { children: React.ReactNode }) {
    const portal = getClubSlugFromPath(usePathname());

    return (
        <RealtimeProvider
            audience="cabinet"
            portal={portal}
            rules={CABINET_REALTIME_RULES}
            refresh={refreshCabinetSession}
        >
            {children}
        </RealtimeProvider>
    );
}
