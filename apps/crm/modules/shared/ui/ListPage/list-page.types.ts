import type { ReactNode } from "react";

import type { ModalDialogProps } from "@workspace/ui";

/** Что форма создания получает от диалога. */
export interface CreateDialogControls {
    /** Закрыть диалог: форма зовёт его после успешного сохранения */
    close: () => void;
}

/** Кнопка «Создать» списка и диалог с формой за ней. */
export interface ListPageCreate {
    /** Подпись кнопки; по умолчанию «Создать» */
    label?: ReactNode;
    /** Заголовок диалога */
    title: ReactNode;
    description?: ReactNode;
    size?: ModalDialogProps["size"];
    /**
     * Форма создания. Сохранила — зовёт `close()`; форма, которой есть что показать после
     * сохранения (ссылка приглашения), не закрывает диалог сама. Закрытый диалог размонтирует
     * форму, так что открытый заново начинается с пустой.
     */
    form: (controls: CreateDialogControls) => ReactNode;
}

/** `page` — заголовок маршрута (h1); `section` — блок внутри другой страницы (хаб настроек). */
export type ListPageVariant = "page" | "section";
