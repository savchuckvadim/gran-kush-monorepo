"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";

import { type Locale, LOCALE_LABELS, LOCALES } from "@/modules/shared/config/locales";
import { Link, usePathname } from "@/modules/shared/i18n/navigation";

import { MoonIcon, SunIcon } from "./icons";
import { type Mode, MODE_EVENT, MODE_KEY, readMode, subscribeMode } from "./mode";

export const ModeSwitch = ({ label }: { label: string }) => {
    const mode = useSyncExternalStore<Mode>(subscribeMode, readMode, () => "dark");
    const [moving, setMoving] = useState(false);

    const toggle = () => {
        const next: Mode = mode === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-mode", next);
        try {
            localStorage.setItem(MODE_KEY, next);
        } catch {
            // private mode: the choice simply is not remembered
        }
        window.dispatchEvent(new Event(MODE_EVENT));
        setMoving(true);
        window.setTimeout(() => setMoving(false), 260);
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={mode === "light"}
            aria-label={label}
            className={`lswitch glass${moving ? " is-moving" : ""}`}
            onClick={toggle}
        >
            <span className="lswitch__thumb">
                <MoonIcon className="ic-moon" />
                <SunIcon className="ic-sun" />
            </span>
        </button>
    );
};

const nextLocale = (locale: Locale): Locale =>
    LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length] ?? locale;

export const LangToggle = ({ label }: { label: string }) => {
    const locale = useLocale() as Locale;
    const pathname = usePathname();
    const next = nextLocale(locale);
    return (
        <Link href={pathname} locale={next} className="chipbtn" aria-label={label}>
            {LOCALE_LABELS[next]}
        </Link>
    );
};

export const LangList = () => {
    const locale = useLocale() as Locale;
    const pathname = usePathname();
    return (
        <span>
            {LOCALES.map((code) => (
                <Link
                    key={code}
                    href={pathname}
                    locale={code}
                    className="chipbtn"
                    aria-current={code === locale ? "true" : undefined}
                >
                    {LOCALE_LABELS[code]}
                </Link>
            ))}
        </span>
    );
};
