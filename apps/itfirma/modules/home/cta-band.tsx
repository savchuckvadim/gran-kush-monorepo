import { useTranslations } from "next-intl";

import { CtaLink } from "@/modules/shared/ui/cta-link";
import { Particles } from "@/modules/shared/ui/effects/particles";
import { Reveal } from "@/modules/shared/ui/reveal";

interface CtaBandProps {
    title?: string;
    text?: string;
}

/** A full-width invitation before the form; service and article pages reuse it with their own words. */
export const CtaBand = ({ title, text }: CtaBandProps) => {
    const t = useTranslations("ctaBand");
    const cta = useTranslations("cta");

    return (
        <section className="wrap py-6">
            <Reveal className="surface relative isolate overflow-hidden px-6 py-16 md:px-16 md:py-24">
                <Particles className="-z-10" />
                <h2 className="max-w-3xl text-4xl leading-[1.05] md:text-6xl">
                    {title ?? t("title")}
                </h2>
                <p className="mt-6 max-w-[55ch] text-lg text-muted-foreground">
                    {text ?? t("text")}
                </p>
                <div className="mt-10">
                    <CtaLink size="lg">{cta("request")}</CtaLink>
                </div>
            </Reveal>
        </section>
    );
};
