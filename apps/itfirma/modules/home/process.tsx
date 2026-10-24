import { useTranslations } from "next-intl";

import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

const STEPS = ["talk", "offer", "build", "launch"] as const;

/** Four numbered steps from the first conversation to support. */
export const Process = () => {
    const t = useTranslations("process");

    return (
        <section
            id="process"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
        >
            <SectionHeading eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
            <ol className="grid gap-6 md:grid-cols-4">
                {STEPS.map((step, index) => (
                    <Reveal
                        key={step}
                        as="li"
                        className="border-t border-border pt-6"
                        delay={index * 90}
                    >
                        <span className="font-mono text-xs text-primary">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="mt-2 text-xl">{t(`steps.${step}.title`)}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t(`steps.${step}.text`)}
                        </p>
                    </Reveal>
                ))}
            </ol>
        </section>
    );
};
