"use client";

import { useOperationToasts } from "./use-operation-toasts";

/** Монтируется один раз в раскладке CRM под realtime: тосты на итог фоновых операций сотрудника. */
export function OperationToasts() {
    useOperationToasts();
    return null;
}
