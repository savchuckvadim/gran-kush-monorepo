import { useTranslations } from "next-intl";

import { OWNER } from "@/modules/shared/config/site";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

const PRINCIPLES = ["own", "clean", "direct", "spain"] as const;

/** The studio in its own voice: how the team works, who leads it, what it holds to. */
export const Team = () => {
    const t = useTranslations("team");

    return (
        <section id="team" className="scroll-mt-20 py-24 md:py-32">
            <div className="wrap grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
                <div>
                    <SectionHeading title={t("title")} size="lg" />
                    <Reveal delay={100}>
                        <div className="mt-8 max-w-[62ch] space-y-5 text-lg text-muted-foreground">
                            <p>{t("text1")}</p>
                            <p>{t("text2")}</p>
                            <p className="text-foreground">{t("founder", { name: OWNER.name })}</p>
                        </div>
                    </Reveal>
                </div>
                <ul className="grid content-start gap-8 sm:grid-cols-2 lg:grid-cols-1 lg:pt-4">
                    {PRINCIPLES.map((item, index) => (
                        <Reveal
                            key={item}
                            as="li"
                            className="border-t border-border pt-5"
                            delay={index * 80}
                        >
                            <h3 className="text-xl">{t(`principles.${item}.title`)}</h3>
                            <p className="mt-2 text-muted-foreground">
                                {t(`principles.${item}.text`)}
                            </p>
                        </Reveal>
                    ))}
                </ul>
            </div>
        </section>
    );
};
