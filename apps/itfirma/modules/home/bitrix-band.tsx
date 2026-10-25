import { useTranslations } from "next-intl";

import { servicePath } from "@/modules/shared/config/services";
import { CtaLink } from "@/modules/shared/ui/cta-link";
import { ThreadLines } from "@/modules/shared/ui/effects/thread-lines";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

const POINTS = ["crm", "automation", "telephony", "apps", "migration", "training"] as const;

/** The service the studio knows deepest, laid out as six plain points over moving threads. */
export const BitrixBand = () => {
    const t = useTranslations("bitrix");
    const cta = useTranslations("cta");

    return (
        <section className="relative isolate overflow-hidden py-24 md:py-32">
            <ThreadLines className="fade-y -z-10" />
            <div className="wrap">
                <SectionHeading kicker={t("kicker")} title={t("title")} lead={t("lead")} />
                <div className="mt-14 grid gap-x-10 gap-y-10 border-t border-border pt-10 md:grid-cols-3">
                    {POINTS.map((point, index) => (
                        <Reveal key={point} delay={(index % 3) * 80}>
                            <h3 className="text-lg md:text-xl">
                                <span className="mr-2 font-mono text-primary">[</span>
                                {t(`points.${point}.title`)}
                                <span className="ml-2 font-mono text-primary">]</span>
                            </h3>
                            <p className="mt-3 max-w-[40ch] text-muted-foreground">
                                {t(`points.${point}.text`)}
                            </p>
                        </Reveal>
                    ))}
                </div>
                <Reveal delay={200}>
                    <div className="mt-14 flex flex-wrap items-center gap-3">
                        <CtaLink>{cta("request")}</CtaLink>
                        <CtaLink href={servicePath("bitrix")} variant="ghost">
                            {t("more")}
                        </CtaLink>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
