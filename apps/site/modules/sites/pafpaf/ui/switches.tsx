"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";

import { type Locale, LOCALE_LABELS, LOCALES } from "@/modules/shared/config/locales";
import { Link, usePathname } from "@/modules/shared/i18n/navigation";

import { LeafIcon, MoonIcon, SunIcon } from "./icons";
import {
    isSmokeOff,
    type Mode,
    MODE_EVENT,
    MODE_KEY,
    readMode,
    setSmokeOff,
    SMOKE_KEY,
    subscribeMode,
    subscribeSmoke,
} from "./mode";

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

// Only pages that show this switch honour the saved choice; elsewhere the smoke is part of the design.
export const SmokeToggle = ({ label, className }: { label: string; className?: string }) => {
    const off = useSyncExternalStore(subscribeSmoke, isSmokeOff, () => false);

    useEffect(() => {
        try {
            if (localStorage.getItem(SMOKE_KEY) === "off") setSmokeOff(true);
        } catch {
            // storage blocked: the smoke stays on
        }
        return () => setSmokeOff(false);
    }, []);

    const toggle = () => {
        setSmokeOff(!off);
        try {
            if (off) localStorage.removeItem(SMOKE_KEY);
            else localStorage.setItem(SMOKE_KEY, "off");
        } catch {
            // private mode: the choice simply is not remembered
        }
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={!off}
            aria-label={label}
            title={label}
            className={className}
            onClick={toggle}
        >
            <LeafIcon off={off} />
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
