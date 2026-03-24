"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` when the viewport matches the provided media query.
 * Default query maps Tailwind `lg` breakpoint: mobile = < 1024px.
 */
export function useIsMobile(query: string = "(max-width: 1023px)"): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(query);

        const update = () => {
            setIsMobile(mql.matches);
        };

        update();

        if (mql.addEventListener) {
            mql.addEventListener("change", update);
            return () => mql.removeEventListener("change", update);
        }

        // Fallback for older browsers.
        mql.addListener(update);
        return () => mql.removeListener(update);
    }, [query]);

    return isMobile;
}

