import { useTranslations } from "next-intl";

import { CtaLink } from "@/modules/shared/ui/cta-link";
import { AuroraCanvas } from "@/modules/shared/ui/effects/aurora-canvas";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SplitText } from "@/modules/shared/ui/split-text";

/** Above the fold: one promise, one sentence, two ways in; the skin's aurora behind it. */
export const Hero = () => {
    const t = useTranslations("hero");
    const cta = useTranslations("cta");

    return (
        <section className="relative isolate overflow-hidden">
            <AuroraCanvas className="fade-b -z-10" />
            <div className="wrap flex min-h-[82dvh] flex-col justify-center pt-16 pb-20 md:pt-20 md:pb-28">
                <h1 className="max-w-5xl text-5xl leading-[1.02] md:text-7xl lg:text-8xl">
                    <SplitText text={t("title")} />
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
