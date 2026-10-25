"use client";

import { useEffect, useState } from "react";

/** A thin band across the screen at 40–45% of its height: the section crossing it is current. */
const BAND = "-40% 0px -55% 0px";

/**
 * Which of the sections (by element id) is on the reading line right now; null above the first
 * and between them. IntersectionObserver, not scroll events, so it costs nothing while idle.
 * `ids` must be a stable array (a module constant).
 */
export const useActiveSection = <T extends string>(
    ids: readonly T[],
    enabled: boolean
): T | null => {
    const [active, setActive] = useState<T | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const crossing = new Set<string>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) crossing.add(entry.target.id);
                    else crossing.delete(entry.target.id);
                }
                setActive(ids.filter((id) => crossing.has(id)).at(-1) ?? null);
            },
            { rootMargin: BAND }
        );
        for (const id of ids) {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        }
        return () => observer.disconnect();
    }, [ids, enabled]);

    return enabled ? active : null;
};
