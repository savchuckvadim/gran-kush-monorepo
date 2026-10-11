"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { Check, Globe } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { type Locale, localeNames, locales } from "@/modules/shared/config/i18n";

/** `align` — which edge of the button the menu sticks to; `start` inside the mobile drawer. */
export function LangSwitcher({ align = "end" }: { align?: "start" | "end" }) {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();
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
        if (newLocale === locale) {
            return;
        }

        // Replace locale in pathname
        const segments = pathname.split("/");
        if (segments[1] && locales.includes(segments[1] as Locale)) {
            segments[1] = newLocale;
        } else {
            segments.splice(1, 0, newLocale);
        }
        // Avoid forcing an extra refresh while Radix Select portal is closing.
        // The navigation itself is enough to reload locale-bound messages.
        router.replace(segments.join("/"));
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
