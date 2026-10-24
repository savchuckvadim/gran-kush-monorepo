import { useTranslations } from "next-intl";

import { ArrowDown, ArrowRight } from "lucide-react";

import { Link } from "@/modules/shared/i18n/navigation";
import { Reveal } from "@/modules/shared/ui/reveal";

import { WordRotator } from "./word-rotator";

const ROTATING_WORDS = ["web", "mobile", "crm", "ai", "bitrix"] as const;

/** Above the fold: what the studio builds, for whom, and two ways in. */
export const Hero = () => {
    const t = useTranslations("hero");
    const words = ROTATING_WORDS.map((key) => t(`words.${key}`));

    return (
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 md:px-6 md:pt-32 md:pb-24">
            <Reveal>
                <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs text-muted-foreground">
                    <span className="inline-block size-1.5 rounded-full bg-success" />
                    {t("badge")}
                </p>
            </Reveal>
            <Reveal delay={80}>
                <h1 className="max-w-4xl text-4xl leading-[1.05] md:text-7xl">
                    {t("titleStart")}
                    <WordRotator words={words} />
                    <span className="text-muted-foreground">{t("titleEnd")}</span>
                </h1>
            </Reveal>
            <Reveal delay={160}>
                <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
                    {t("lead")}
                </p>
            </Reveal>
            <Reveal delay={240}>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                    <Link
                        href="/#contact"
                        className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {t("ctaPrimary")}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        href="/#services"
                        className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card/60 px-6 font-medium transition-colors hover:bg-accent"
                    >
                        {t("ctaSecondary")}
                        <ArrowDown className="size-4" />
                    </Link>
                </div>
            </Reveal>
        </section>
    );
};
