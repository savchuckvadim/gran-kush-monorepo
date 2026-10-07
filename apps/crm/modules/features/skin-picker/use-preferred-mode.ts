"use client";

import { useTheme } from "next-themes";

import type { SkinMode } from "@/modules/shared/config/skins";
import { useHydrated } from "@/modules/shared/lib/use-hydrated";

/**
 * The user's own light/dark choice; next-themes keeps it even while a one-mode skin forces
 * the other. Light until hydrated, because the server does not know it.
 */
export function usePreferredMode(): SkinMode {
    const { resolvedTheme } = useTheme();
    const hydrated = useHydrated();
    return hydrated && resolvedTheme === "dark" ? "dark" : "light";
}
