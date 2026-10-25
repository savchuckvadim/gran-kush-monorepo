import { useTranslations } from "next-intl";

import { CtaLink } from "@/modules/shared/ui/cta-link";
import { AuroraCanvas } from "@/modules/shared/ui/effects/aurora-canvas";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SplitText } from "@/modules/shared/ui/split-text";

import { WordRotator } from "./word-rotator";

/** Keys of `hero.words.<key>`: what the studio makes, one at a time in the headline. */
const ROTATING_WORDS = ["web", "mobile", "crm", "ai", "bitrix"] as const;

/** Above the fold: one promise with a changing object, one sentence, two ways in. */
export const Hero = () => {
    const t = useTranslations("hero");
    const cta = useTranslations("cta");
    const words = ROTATING_WORDS.map((key) => t(`words.${key}`));

    return (
        <section className="relative isolate overflow-hidden">
            <AuroraCanvas className="fade-b -z-10" />
            <div className="wrap flex min-h-[82dvh] flex-col justify-center pt-16 pb-20 md:pt-20 md:pb-28">
                <h1 className="max-w-5xl text-5xl leading-[1.04] md:text-7xl">
                    <SplitText text={t("titleStart")} />
                    <WordRotator words={words} />
                    <span className="text-muted-foreground">{t("titleEnd")}</span>
                </h1>
                <Reveal delay={420}>
                    <p className="mt-8 max-w-2xl text-lg text-muted-foreground md:text-2xl">
                        {t("lead")}
                    </p>
                </Reveal>
                <Reveal delay={560}>
                    <div className="mt-10 flex flex-wrap items-center gap-3">
                        <CtaLink size="lg">{cta("request")}</CtaLink>
                        <CtaLink href="/#services" variant="secondary" size="lg">
                            {cta("seeServices")}
                        </CtaLink>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
