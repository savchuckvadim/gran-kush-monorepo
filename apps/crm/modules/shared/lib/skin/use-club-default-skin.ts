"use client";

import { useEffect } from "react";

import { normalizeSkinId } from "@/modules/shared/config/skins";

import { setClubDefaultSkin } from "./skin-store";

/**
 * Тема клуба для страницы, которая показывает клуб (оболочка CRM, раздел клуба в кабинете):
 * действует, пока страница открыта; личный выбор человека всё равно главнее. Неизвестный id
 * (тему убрали из CRM) превращается в тему PafPaf.
 */
export function useClubDefaultSkin(raw: string | null | undefined): void {
    const skin = normalizeSkinId(raw);
    useEffect(() => {
        setClubDefaultSkin(skin);
        return () => setClubDefaultSkin(null);
    }, [skin]);
}
