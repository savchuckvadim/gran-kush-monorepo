"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Globe } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { localeNames, locales } from "@/modules/shared/config/i18n";

import { useChangeLocale } from "./use-change-locale";

/** `align` — which edge of the button the menu sticks to; `start` inside the mobile drawer. */
export function LangSwitcher({ align = "end" }: { align?: "start" | "end" }) {
    const { locale, changeLocale } = useChangeLocale();
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (rootRef.current && !rootRef.current.contains(target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    const handleLocaleChange = (newLocale: string) => {
        changeLocale(newLocale);
        setIsOpen(false);
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-label="Change language"
                className="inline-flex items-center gap-2 rounded-md border-none bg-transparent p-3 py-1 text-sm hover:bg-accent"
                style={{
                    cursor: "pointer",
                }}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <Globe className="size-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{localeNames[locale]}</span>
                {/* <ChevronDown className="size-4" /> */}
            </button>

            {isOpen ? (
                <div
                    className={cn(
                        "absolute z-50 mt-2 min-w-[150px] overflow-hidden rounded-md border bg-popover p-1 shadow-md",
                        align === "start" ? "left-0" : "right-0"
                    )}
                >
                    {locales.map((loc) => (
                        <button
                            key={loc}
                            type="button"
                            className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                            style={{
                                cursor: "pointer",
                            }}
                            onClick={() => handleLocaleChange(loc)}
                        >
                            <span>{localeNames[loc]}</span>
                            {loc === locale ? <Check className="size-4 text-primary" /> : null}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
