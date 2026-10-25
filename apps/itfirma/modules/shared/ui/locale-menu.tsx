"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Check, Languages } from "lucide-react";

import { isLocale, LOCALE_LABELS, LOCALE_NAMES, LOCALES } from "@/modules/shared/config/locales";
import { Link, usePathname } from "@/modules/shared/i18n/navigation";

import { HEADER_POPOVER, ICON_BUTTON } from "./icon-button";
import { useDismiss } from "./use-dismiss";

/** One button with the current language code; it opens the five languages by their own names. */
export const LocaleMenu = () => {
    const t = useTranslations("nav");
    const current = useLocale();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelId = useId();
    const close = useCallback(() => setOpen(false), []);

    const refs = useMemo(() => [rootRef], []);
    useDismiss(open, close, refs);

    const code = isLocale(current) ? LOCALE_LABELS[current] : current.toUpperCase();

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={t("language")}
                title={t("language")}
                onClick={() => setOpen((value) => !value)}
                className={`${ICON_BUTTON} font-mono text-xs`}
            >
                <Languages className="size-4" />
                <span>{code}</span>
            </button>
            {open ? (
                <nav
                    id={panelId}
                    aria-label={t("language")}
                    className={`${HEADER_POPOVER} w-44 p-1.5`}
                >
                    <ul>
                        {LOCALES.map((locale) => (
                            <li key={locale}>
                                <Link
                                    href={pathname}
                                    locale={locale}
                                    hrefLang={locale}
                                    aria-current={locale === current ? "true" : undefined}
                                    onClick={close}
                                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                                >
                                    <span>{LOCALE_NAMES[locale]}</span>
                                    {locale === current ? (
                                        <Check className="size-4 text-primary" />
                                    ) : (
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {LOCALE_LABELS[locale]}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            ) : null}
        </div>
    );
};
