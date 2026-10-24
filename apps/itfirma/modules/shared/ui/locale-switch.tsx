"use client";

import { useLocale, useTranslations } from "next-intl";

import { LOCALE_LABELS, LOCALES } from "@/modules/shared/config/locales";
import { Link, usePathname } from "@/modules/shared/i18n/navigation";

/** The four languages as short links; the current one is plain text. */
export const LocaleSwitch = () => {
    const t = useTranslations("nav");
    const locale = useLocale();
    const pathname = usePathname();

    return (
        <nav aria-label={t("language")} className="flex items-center gap-0.5 font-mono text-xs">
            {LOCALES.map((item) =>
                item === locale ? (
                    <span key={item} className="rounded-md bg-accent px-2 py-1 text-foreground">
                        {LOCALE_LABELS[item]}
                    </span>
                ) : (
                    <Link
                        key={item}
                        href={pathname}
                        locale={item}
                        className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {LOCALE_LABELS[item]}
                    </Link>
                )
            )}
        </nav>
    );
};
