import NextLink from "next/link";
import { getTranslations } from "next-intl/server";

import type { ReactNode } from "react";

import { HOME_SECTIONS } from "@/modules/shared/config/home-sections";
import type { Locale } from "@/modules/shared/config/locales";
import { crmHref, ROUTES } from "@/modules/shared/config/routes";
import { BRAND, SITE } from "@/modules/shared/config/site";
import type { Site } from "@/payload-types";

import { GlassLight, Reveal } from "./ui/effects";
import { LiquidButton } from "./ui/liquid-button";
import { Nav, type NavItem } from "./ui/nav";
import { SmokeLayer } from "./ui/smoke-layer";
import { LogoMark, SvgDefs } from "./ui/svg-defs";
import { LangList, LangToggle, ModeSwitch } from "./ui/switches";

const LEGAL_FOOTER_LINKS = ["aviso-legal", "privacidad", "cookies", "terminos"] as const;

interface SiteFrameProps {
    locale: Locale;
    site: Site | null;
    // which nav item is current on this page (home sections are tracked while scrolling)
    current: string;
    children: ReactNode;
}

export const SiteFrame = async ({ locale, site, current, children }: SiteFrameProps) => {
    const t = await getTranslations();
    const home = ROUTES.home(locale);
    const items: NavItem[] = [
        {
            id: "home",
            label: t("nav.home"),
            href: home,
            spy: current === "home" ? "top" : undefined,
        },
        ...HOME_SECTIONS[SITE].map((section) => ({
            id: section.id,
            label: t(`nav.${section.label}`),
            href: `${home}#${section.anchor}`,
            spy: current === "home" ? section.anchor : undefined,
        })),
        { id: "pricing", label: t("nav.pricing"), href: ROUTES.page(locale, "precios") },
    ];
    const labels = { language: t("a11y.language"), mode: t("a11y.mode") };

    return (
        <>
            <SvgDefs />
            <SmokeLayer />
            <Nav
                items={items}
                homeHref={home}
                activeId={current}
                crm={{ label: t("nav.crm"), href: crmHref(locale, "login") }}
                labels={labels}
            />
            <div className="topctl glass">
                <LangToggle label={labels.language} />
                <ModeSwitch label={labels.mode} />
                <a className="chipbtn" href={crmHref(locale, "login")}>
                    {t("nav.crm")}
                </a>
                <LiquidButton href={crmHref(locale, "register")} variant="primary" size="sm">
                    {t("nav.register")}
                </LiquidButton>
            </div>
            <main>{children}</main>
            <footer className="foot glass">
                <div className="foot__row">
                    <NextLink className="logo" href={home}>
                        <LogoMark />
                        <span>{BRAND.wordmark}</span>
                    </NextLink>
                    <div className="foot__links">
                        {items.slice(1).map((item) => (
                            <NextLink key={item.id} href={item.href}>
                                {item.label}
                            </NextLink>
                        ))}
                        <a href={crmHref(locale, "login")}>{t("nav.crm")}</a>
                    </div>
                </div>
                {(site?.footerNote || site?.legalNote) && (
                    <div className="foot__row">
                        {site?.footerNote && <span>{site.footerNote}</span>}
                        {site?.legalNote && <span>{site.legalNote}</span>}
                    </div>
                )}
                <div className="foot__row">
                    <div className="foot__links">
                        {LEGAL_FOOTER_LINKS.map((doc) => (
                            <NextLink key={doc} href={ROUTES.legal(locale, doc)}>
                                {t(`footer.legal.${doc}`)}
                            </NextLink>
                        ))}
                    </div>
                </div>
                <div className="foot__row">
                    <span>
                        {t("footer.rights", {
                            year: new Date().getFullYear(),
                            brand: BRAND.name,
                            domain: BRAND.domains.site,
                        })}
                    </span>
                    <LangList />
                </div>
            </footer>
            <Reveal />
            <GlassLight />
        </>
    );
};
