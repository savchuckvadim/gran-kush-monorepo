"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Moon, Sun } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

const noSubscribe = () => () => {};

/** Светлый/тёмный режим. Скрыт, когда тема закрепляет один режим (next-themes `forcedTheme`). */
export function HeaderThemeToggle({ className }: { className?: string }) {
    const t = useTranslations("crm.shell.tray");
    const { resolvedTheme, setTheme, forcedTheme } = useTheme();
    // The theme is known only in the browser; rendering nothing on the server avoids a flicker of the wrong icon.
    const isClient = useSyncExternalStore(
        noSubscribe,
        () => true,
        () => false
    );

    if (!isClient || forcedTheme) return null;

    const isDark = resolvedTheme === "dark";
    const label = isDark ? t("lightMode") : t("darkMode");

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            title={label}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn("rounded-full", className)}
        >
            {isDark ? <Sun /> : <Moon />}
        </Button>
    );
}
