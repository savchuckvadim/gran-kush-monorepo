"use client";

import { Button } from "@workspace/ui";

import { useSkin } from "@/modules/shared/providers/skin-provider";

import { useSkinText } from "./use-skin-text";

/**
 * У клуба есть своя тема, а человек выбрал другую: напоминаем о теме клуба и даём вернуться к
 * ней. Своя тема остаётся выбором самого человека — клуб её не перекрывает.
 */
export function ClubSkinNotice() {
    const text = useSkinText();
    const { clubDefault, hasPersonalSkin, skin, followClubSkin } = useSkin();

    if (!clubDefault || !hasPersonalSkin || skin === clubDefault) return null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
            <span className="text-muted-foreground">
                {text.t("clubSkin.notice", { name: text.name(clubDefault) })}
            </span>
            <Button size="sm" variant="outline" onClick={followClubSkin}>
                {text.t("clubSkin.follow")}
            </Button>
        </div>
    );
}
