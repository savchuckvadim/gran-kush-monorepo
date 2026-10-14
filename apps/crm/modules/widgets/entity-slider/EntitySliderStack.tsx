"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { sliderStore, useSliderStack } from "@/modules/shared/lib/entity-slider";

import { EntitySliderPanel } from "./EntitySliderPanel";

/** All open entity sliders, bottom first. Lives once in the CRM shell. */
export function EntitySliderStack() {
    const stack = useSliderStack();
    const pathname = usePathname();

    useEffect(() => {
        sliderStore.syncWithPath(pathname);
    }, [pathname]);

    return stack.map((entry, level) => (
        <EntitySliderPanel
            key={`${level}:${entry.kind}:${entry.id}`}
            entry={entry}
            level={level}
            covered={level < stack.length - 1}
        />
    ));
}
