"use client";

import { useParams } from "next/navigation";

import { refreshCrmSession } from "@/modules/shared/api/session-refresh";
import { RealtimeProvider } from "@/modules/shared/realtime";

import { CRM_REALTIME_RULES } from "./realtime-rules";

/** Живые данные CRM клуба из адреса `/{язык}/{клуб}/crm/…`: соединение на куке сотрудника. */
export function CrmRealtime({ children }: { children: React.ReactNode }) {
    const params = useParams<{ portal?: string }>();
    const portal = params.portal?.toLowerCase() ?? null;

    return (
        <RealtimeProvider
            audience="crm"
            portal={portal}
            rules={CRM_REALTIME_RULES}
            refresh={refreshCrmSession}
        >
            {children}
        </RealtimeProvider>
    );
}
