"use client";

import { useTheme } from "next-themes";

/**
 * The page is dark right now. A skin with a single mode forces it through `forcedTheme`, and
 * next-themes leaves that out of `resolvedTheme` — reading only the latter shows dark ink on a
 * forced-dark page.
 */
export function useIsDarkTheme(): boolean {
    const { resolvedTheme, forcedTheme } = useTheme();
    return (forcedTheme ?? resolvedTheme) === "dark";
}
