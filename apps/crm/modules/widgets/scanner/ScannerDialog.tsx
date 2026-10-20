"use client";

import { useScannerState } from "@/modules/shared/lib/scan";

import { ScannerSession } from "./ScannerSession";

/**
 * Сканер CRM, один на оболочку: его открывают шапка, черновик заказа и ссылка с этикетки.
 * Каждое открытие — новый сеанс с чистого шага.
 */
export function ScannerDialog() {
    const state = useScannerState();
    return state.open ? <ScannerSession key={state.session} initialCode={state.code} /> : null;
}
