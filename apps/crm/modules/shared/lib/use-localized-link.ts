"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";

import { Locale } from "@/i18n";

/**
 * Custom hook to get a function that generates localized links.
 * Since middleware is configured with `localePrefix: "always"`,
 * all routes must include the locale prefix.
 */
export function useLocalizedLink() {
    const currentLocale = useLocale() as Locale;

    const getLocalizedPath = useCallback(
        (path: string) => {
            // Handle root path
            if (path === "/") {
                return `/${currentLocale}`;
            }
            // Remove leading slash if present
            const cleanPath = path.startsWith("/") ? path.slice(1) : path;
            // Add locale prefix
            return `/${currentLocale}/${cleanPath}`;
        },
        [currentLocale]
    );

    return getLocalizedPath;
}
