import { useTranslations } from "next-intl";

import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

const STEPS = ["talk", "offer", "build", "launch"] as const;
const MODELS = ["fixed", "time", "retainer"] as const;

/** How a project goes, in four steps, and the three ways to pay for it. */
export const Process = () => {
    const t = useTranslations("process");

    return (
        <section id="process" className="scroll-mt-20 py-24 md:py-32">
            <div className="wrap">
                <SectionHeading title={t("title")} lead={t("lead")} />
                <ol className="mt-14 grid gap-10 border-t border-border pt-10 md:grid-cols-4 md:gap-8">
                    {STEPS.map((step, index) => (
                        <Reveal key={step} as="li" delay={index * 90}>
                            <p className="font-mono text-sm text-primary">
                                [{String(index + 1).padStart(2, "0")}]
                            </p>
                            <h3 className="mt-3 text-xl md:text-2xl">{t(`steps.${step}.title`)}</h3>
                            <p className="mt-3 text-muted-foreground">{t(`steps.${step}.text`)}</p>
                        </Reveal>
                    ))}
                </ol>
                <div className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
                    <Reveal>
                        <h3 className="text-3xl leading-tight md:text-4xl">{t("models.title")}</h3>
                        <p className="mt-5 max-w-[50ch] text-lg text-muted-foreground">
                            {t("models.lead")}
                        </p>
                    </Reveal>
                    <dl className="divide-y divide-border border-y border-border">
                        {MODELS.map((model, index) => (
                            <Reveal
                                key={model}
                                className="grid gap-3 py-7 md:grid-cols-[14rem_1fr] md:gap-10"
                                delay={index * 80}
                            >
                                <dt className="text-xl">{t(`models.items.${model}.title`)}</dt>
                                <dd className="text-muted-foreground">
                                    {t(`models.items.${model}.text`)}
                                </dd>
                            </Reveal>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
};
