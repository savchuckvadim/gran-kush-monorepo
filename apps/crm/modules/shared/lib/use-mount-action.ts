"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

export type MountActionState<T> =
    | { status: "pending" }
    | { status: "success"; data: T }
    | { status: "error"; error: unknown };

/**
 * Одноразовое действие при открытии страницы — например, ссылка из письма с одноразовым токеном.
 * Не `useMutation`: строгий режим React снимает и заново ставит подписку наблюдателя, и мутация,
 * запущенная в эффекте монтирования, теряет его — страница навсегда остаётся в «загрузке».
 * Действие выполняется один раз, его исход хранится в состоянии компонента.
 */
export function useMountAction<T>(run: () => Promise<T>): MountActionState<T> {
    const [state, setState] = useState<MountActionState<T>>({ status: "pending" });
    const started = useRef(false);
    const action = useEffectEvent(run);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        action().then(
            (data) => setState({ status: "success", data }),
            (error: unknown) => setState({ status: "error", error })
        );
    }, []);

    return state;
}
