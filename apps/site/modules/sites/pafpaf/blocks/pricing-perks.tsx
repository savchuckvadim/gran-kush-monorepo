import { useTranslations } from "next-intl";

import type { Locale } from "@/modules/shared/config/locales";
import { crmHref } from "@/modules/shared/config/routes";

import { FeatureIconSvg } from "../ui/icons";
import { LiquidButton } from "../ui/liquid-button";

const PERKS = [
    { key: "minimal", icon: "layers" },
    { key: "eu", icon: "shield" },
    { key: "freedom", icon: "phone" },
] as const;

const DELAYS = ["", " d1", " d2"] as const;

/**
 * Under the prices, for whoever scrolls on without picking a plan: bright cards with what every
 * plan includes, then one button to the free year.
 */
export const PricingPerks = ({ locale }: { locale: Locale }) => {
    const t = useTranslations("perks");

    return (
        <section className="sec perks-sec">
            <div className="wrap center">
                <span className="eyebrow">{t("eyebrow")}</span>
                <h2 className="h2 reveal">{t("title")}</h2>
            </div>
            <div className="wrap perks">
                {PERKS.map((perk, index) => (
                    <article key={perk.key} className={`perk reveal${DELAYS[index]}`}>
                        <span className="perk__ico">
                            <FeatureIconSvg name={perk.icon} />
                        </span>
                        <div>
                            <h3>{t(`items.${perk.key}.title`)}</h3>
                            <p>{t(`items.${perk.key}.text`)}</p>
                        </div>
                    </article>
                ))}
            </div>
            <div className="wrap perks-cta reveal">
                <LiquidButton href={crmHref(locale, "register")} variant="primary">
                    {t("cta")}
                </LiquidButton>
                <p className="small">{t("note")}</p>
            </div>
        </section>
    );
};
