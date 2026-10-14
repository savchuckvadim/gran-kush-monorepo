"use client";

import { useTranslations } from "next-intl";

import { SlideOver } from "@workspace/ui";

import { type SliderEntry, sliderStore } from "@/modules/shared/lib/entity-slider";

import { EntityPanelContent } from "./EntityPanelContent";
import { EntitySliderActions } from "./EntitySliderActions";

interface EntitySliderPanelProps {
    entry: SliderEntry;
    level: number;
    covered: boolean;
}

export function EntitySliderPanel({ entry, level, covered }: EntitySliderPanelProps) {
    const t = useTranslations("crm.slider");

    return (
        <SlideOver
            open
            onOpenChange={(open) => {
                if (!open) sliderStore.close();
            }}
            level={level}
            covered={covered}
            title={t(entry.kind)}
            closeLabel={t("close")}
            actions={<EntitySliderActions href={entry.href} />}
        >
            <EntityPanelContent entry={entry} />
        </SlideOver>
    );
}
