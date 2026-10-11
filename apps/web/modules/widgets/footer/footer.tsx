"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { legalPageUrl } from "@/modules/shared/config/legal";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

export function Footer() {
    const t = useTranslations("navigation");
    const tCommon = useTranslations("common");
    const locale = useLocale();
    const localizedLink = useLocalizedLink();

    return (
        <footer className="border-t bg-background flex justify-center">
            <div className="container py-10 md:py-12">
                <div className="grid gap-8 md:grid-cols-4">
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold">{tCommon("companyName")}</h3>
                        <p className="text-sm text-muted-foreground">{tCommon("companyTagline")}</p>
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold">{t("navigationSection")}</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link
                                    href={localizedLink(ROUTES.HOME)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t("home")}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={localizedLink(ROUTES.ABOUT)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t("about")}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={localizedLink(ROUTES.CONTACTS)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t("contacts")}
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold">{t("accountSection")}</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link
                                    href={localizedLink(ROUTES.LOGIN)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t("login")}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={localizedLink(ROUTES.REGISTER)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t("register")}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={localizedLink(ROUTES.PROFILE)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t("profile")}
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold">{t("legalSection")}</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a
                                    href={legalPageUrl(locale, "privacidad")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t("privacy")}
                                </a>
                            </li>
                            <li>
                                <a
                                    href={legalPageUrl(locale, "terminos")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t("terms")}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                    <p>
                        &copy; {new Date().getFullYear()} {tCommon("companyName")}.{" "}
                        {tCommon("allRightsReserved")}
                    </p>
                </div>
            </div>
        </footer>
    );
}
