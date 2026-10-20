"use client";

import { createContext, useContext, useEffect, useRef } from "react";

import type { DomainEvent, EventName } from "@workspace/domain-events";

import type { RealtimeStatus } from "./realtime.types";

export type RealtimeListener = (event: DomainEvent) => void;

export interface RealtimeContextValue {
    status: RealtimeStatus;
    subscribe: (listener: RealtimeListener) => () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/** Есть ли сейчас связь с сервером; вне провайдера — `offline`. */
export const useRealtimeStatus = (): RealtimeStatus =>
    useContext(RealtimeContext)?.status ?? "offline";

/**
 * Реакция компонента на событие сверх перечитывания данных (тост «заказ готов», звук на стойке).
 * Обработчик держится в ref: новый на каждом рендере не переподписывает.
 */
export const useRealtimeEvent = (
    names: readonly EventName[],
    handler: (event: DomainEvent) => void
): void => {
    const context = useContext(RealtimeContext);
    const handlerRef = useRef(handler);
    handlerRef.current = handler;
    const key = names.join(",");

    useEffect(() => {
        if (!context) return undefined;
        const wanted = new Set(key.split(","));
        return context.subscribe((event) => {
            if (wanted.has(event.name)) handlerRef.current(event);
        });
    }, [context, key]);
};
