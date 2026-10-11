"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { Search } from "lucide-react";

import { Button } from "@workspace/ui";

import { useCommandPalette } from "@/modules/features";

const noSubscribe = () => () => {};

/** Поле поиска в шапке открывает палитру Ctrl/⌘ K; на телефоне — только иконка. */
export function SearchTrigger() {
    const t = useTranslations("crm.search");
    const { open } = useCommandPalette();
    const shortcut = useSyncExternalStore(
        noSubscribe,
        () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ K" : "Ctrl K"),
        () => "Ctrl K"
    );

    return (
        <>
            <Button
                variant="outline"
                onClick={open}
                className="text-muted-foreground hidden w-56 justify-start font-normal md:inline-flex lg:w-72"
            >
                <Search />
                <span className="flex-1 text-left">{t("trigger")}</span>
                <kbd className="bg-muted pointer-events-none rounded border px-1.5 py-0.5 font-mono text-[0.625rem] font-medium">
                    {shortcut}
                </kbd>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={open}
                aria-label={t("trigger")}
                className="md:hidden"
            >
                <Search />
            </Button>
        </>
    );
}
