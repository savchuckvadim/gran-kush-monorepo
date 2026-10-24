import { useTranslations } from "next-intl";

import { OWNER } from "@/modules/shared/config/site";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

const PRINCIPLES = ["own", "clean", "direct", "spain"] as const;

/** Who is behind the studio and how it works; no invented numbers, only principles. */
export const About = () => {
    const t = useTranslations("about");

    return (
        <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24">
            <div className="grid gap-10 md:grid-cols-[1.1fr_1fr]">
                <div>
                    <SectionHeading eyebrow={t("eyebrow")} title={t("title")} />
                    <Reveal delay={100}>
                        <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                            {t("text", { name: OWNER.name })}
                        </p>
                    </Reveal>
                </div>
                <ul className="grid gap-4 self-end sm:grid-cols-2">
                    {PRINCIPLES.map((item, index) => (
                        <Reveal key={item} as="li" className="surface p-5" delay={index * 80}>
                            <h3 className="text-base">{t(`principles.${item}.title`)}</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                {t(`principles.${item}.text`)}
                            </p>
                        </Reveal>
                    ))}
                </ul>
            </div>
        </section>
    );
};
