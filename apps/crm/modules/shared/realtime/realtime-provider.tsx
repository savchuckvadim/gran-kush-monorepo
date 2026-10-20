"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import type { DomainEvent } from "@workspace/domain-events";

import { RealtimeConnection } from "./realtime-connection";
import { RealtimeContext, type RealtimeListener } from "./realtime-context";
import { REALTIME_FALLBACK_POLL_MS } from "./realtime.config";
import type { RealtimeAudience, RealtimeRule, RealtimeStatus } from "./realtime.types";

interface RealtimeProviderProps {
    audience: RealtimeAudience;
    /** Клуб соединения; без клуба приходят только события аккаунта */
    portal: string | null;
    rules: readonly RealtimeRule[];
    refresh: () => Promise<void>;
    children: React.ReactNode;
}

/**
 * Живые данные приложения: соединение с шлюзом, на событие — перечитывание ключей по правилам
 * сущностей. Восстановили связь — перечитываются все открытые запросы (события за обрыв могли
 * пропасть); связи нет — те же запросы перечитываются по таймеру, как раньше опрос.
 */
export function RealtimeProvider({
    audience,
    portal,
    rules,
    refresh,
    children,
}: RealtimeProviderProps) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<RealtimeStatus>("connecting");
    const listeners = useRef(new Set<RealtimeListener>());
    const latest = useRef({ rules, refresh });
    latest.current = { rules, refresh };

    useEffect(() => {
        const apply = (event: DomainEvent) => {
            for (const rule of latest.current.rules) {
                if (!rule.events.includes(event.name)) continue;
                for (const queryKey of rule.keys(event, { portal })) {
                    // запрос уже в пути — не обрывать его ради такого же второго
                    void queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false });
                }
            }
            for (const listener of listeners.current) listener(event);
        };
        const connection = new RealtimeConnection({
            audience,
            portal,
            refresh: () => latest.current.refresh(),
            onEvent: apply,
            onStatus: setStatus,
            onResync: () => void queryClient.invalidateQueries(),
        });
        connection.start();
        return () => connection.stop();
    }, [audience, portal, queryClient]);

    useEffect(() => {
        if (status !== "offline") return undefined;
        const timer = setInterval(
            () => void queryClient.invalidateQueries({ refetchType: "active" }),
            REALTIME_FALLBACK_POLL_MS
        );
        return () => clearInterval(timer);
    }, [status, queryClient]);

    const value = useMemo(
        () => ({
            status,
            subscribe: (listener: RealtimeListener) => {
                listeners.current.add(listener);
                return () => {
                    listeners.current.delete(listener);
                };
            },
        }),
        [status]
    );

    return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
