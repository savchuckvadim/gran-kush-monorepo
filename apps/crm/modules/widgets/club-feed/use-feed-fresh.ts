"use client";

import { useCallback, useState } from "react";

import { TIMELINE_EVENTS } from "@/modules/entities/timeline/realtime";
import { useRealtimeEvent } from "@/modules/shared/realtime";

/**
 * Сколько нового случилось с последней загрузки ленты. Лента не перечитывает себя сама — так
 * список не прыгает под рукой; новые записи показывает кнопка «Новых записей: N».
 */
export function useFeedFresh(): { fresh: number; reset: () => void } {
    const [fresh, setFresh] = useState(0);
    useRealtimeEvent(TIMELINE_EVENTS, () => setFresh((count) => count + 1));
    const reset = useCallback(() => setFresh(0), []);
    return { fresh, reset };
}
