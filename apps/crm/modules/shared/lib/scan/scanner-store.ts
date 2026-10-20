"use client";

import { useSyncExternalStore } from "react";

export interface ScannerState {
    open: boolean;
    /** Уже прочитанный код (ссылка с этикетки): сканер сразу его проверяет */
    code?: string;
    /** Каждое открытие — новый сеанс: диалог начинает с чистого шага */
    session: number;
}

const CLOSED: ScannerState = { open: false, session: 0 };

let state: ScannerState = CLOSED;
const listeners = new Set<() => void>();

const setState = (next: ScannerState) => {
    state = next;
    listeners.forEach((listener) => listener());
};

/** Один сканер на всю CRM: его открывают шапка, черновик заказа и ссылка с этикетки. */
export const scannerStore = {
    subscribe(listener: () => void): () => void {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },

    getSnapshot: (): ScannerState => state,

    getServerSnapshot: (): ScannerState => CLOSED,

    open(code?: string): void {
        setState({ open: true, code, session: state.session + 1 });
    },

    close(): void {
        setState({ ...state, open: false, code: undefined });
    },
};

export const useScannerState = (): ScannerState =>
    useSyncExternalStore(
        scannerStore.subscribe,
        scannerStore.getSnapshot,
        scannerStore.getServerSnapshot
    );
