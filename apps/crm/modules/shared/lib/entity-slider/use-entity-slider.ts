"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { useLocalizedLink } from "../use-localized-link";

import { canSlide, entityPath, type EntityRef } from "./entity-ref";
import { type SliderEntry, sliderStore } from "./slider-store";

/** The open panels, bottom first. */
export function useSliderStack(): readonly SliderEntry[] {
    return useSyncExternalStore(
        sliderStore.subscribe,
        sliderStore.getSnapshot,
        sliderStore.getServerSnapshot
    );
}

/** The entity's localized page. */
export function useEntityHref() {
    const toAppPath = useLocalizedLink();
    return useCallback((ref: EntityRef) => toAppPath(entityPath(ref)), [toAppPath]);
}

/**
 * Opens an entity over the page on a wide screen; a phone gets the entity's page. For rows and
 * cards that react to a click; plain links use `EntityLink`.
 */
export function useOpenEntity() {
    const router = useRouter();
    const hrefOf = useEntityHref();
    return useCallback(
        (ref: EntityRef) => {
            const href = hrefOf(ref);
            if (canSlide()) sliderStore.open(ref, href);
            else router.push(href);
        },
        [hrefOf, router]
    );
}
