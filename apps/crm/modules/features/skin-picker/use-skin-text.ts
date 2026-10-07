"use client";

import { useTranslations } from "next-intl";

import type { SkinDefinition, SkinId, SkinMode, SkinTag } from "@/modules/shared/config/skins";

export function useSkinText() {
    const t = useTranslations("crm.appearance");

    return {
        t,
        name: (id: SkinId) => t(`skins.${id}.name`),
        description: (id: SkinId) => t(`skins.${id}.description`),
        tag: (tag: SkinTag) => t(`tags.${tag}`),
        modeName: (skin: SkinDefinition, mode: SkinMode) =>
            skin.hasModeNames ? t(`skins.${skin.id}.modes.${mode}`) : t(`mode.${mode}`),
    };
}
