import { useTranslations } from "next-intl";

import type { ServicePageContent } from "@/modules/content/types";
import { CtaBand } from "@/modules/home/cta-band";
import { SERVICE_KEYS, servicePath } from "@/modules/shared/config/services";
import { Link } from "@/modules/shared/i18n/navigation";
import { CtaLink } from "@/modules/shared/ui/cta-link";
import { AuroraCanvas } from "@/modules/shared/ui/effects/aurora-canvas";
import { FaqList } from "@/modules/shared/ui/faq-list";
import { Reveal } from "@/modules/shared/ui/reveal";

interface ServicePageProps {
    content: ServicePageContent;
}

/** One service, top to bottom: the promise, who it is for, what is delivered, how, and the questions. */
export const ServicePage = ({ content }: ServicePageProps) => {
    const t = useTranslations("servicePage");
    const cta = useTranslations("cta");
    const services = useTranslations("services.items");
    const others = SERVICE_KEYS.filter((key) => key !== content.key);

    return (
        <article>
            <header className="relative isolate overflow-hidden">
                <AuroraCanvas className="fade-b -z-10" strength={0.55} />
                <div className="wrap pt-16 pb-16 md:pt-24 md:pb-24">
                    <p className="text-sm text-primary">
                        <Link href="/#services" className="hover:underline">
                            {t("allServices")}
                        </Link>
                    </p>
                    <h1 className="mt-4 max-w-4xl text-4xl leading-[1.05] md:text-6xl lg:text-7xl">
                        {content.title}
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-2xl">
                        {content.lead}
                    </p>
                    <div className="mt-10">
                        <CtaLink size="lg">{cta("request")}</CtaLink>
                    </div>
                </div>
            </header>

            <section className="wrap grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr] lg:gap-20 md:py-24">
                <Reveal className="max-w-[65ch] space-y-5 text-lg text-muted-foreground">
                    {content.intro.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                    ))}
                </Reveal>
                <Reveal delay={100}>
                    <h2 className="text-2xl">{t("forWhom")}</h2>
                    <ul className="mt-5 space-y-3">
                        {content.forWhom.map((line) => (
                            <li key={line} className="flex gap-3 text-muted-foreground">
                                <span className="font-mono text-primary">[ ]</span>
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                </Reveal>
            </section>

            <section className="wrap py-16 md:py-24">
                <Reveal>
                    <h2 className="text-3xl md:text-5xl">{t("deliverables")}</h2>
                </Reveal>
                <ul className="mt-12 grid gap-x-12 gap-y-10 border-t border-border pt-10 md:grid-cols-2 lg:grid-cols-3">
                    {content.deliverables.map((item, index) => (
                        <Reveal key={item.title} as="li" delay={(index % 3) * 80}>
                            <h3 className="text-xl">{item.title}</h3>
                            <p className="mt-3 max-w-[42ch] text-muted-foreground">{item.text}</p>
                        </Reveal>
                    ))}
                </ul>
            </section>

            <section className="wrap py-16 md:py-24">
                <Reveal>
                    <h2 className="text-3xl md:text-5xl">{t("how")}</h2>
                </Reveal>
                <ol className="mt-12 grid gap-10 border-t border-border pt-10 md:grid-cols-2 lg:grid-cols-4">
                    {content.steps.map((step, index) => (
                        <Reveal key={step.title} as="li" delay={index * 80}>
                            <p className="font-mono text-sm text-primary">
                                [{String(index + 1).padStart(2, "0")}]
                            </p>
                            <h3 className="mt-3 text-xl">{step.title}</h3>
                            <p className="mt-3 text-muted-foreground">{step.text}</p>
                        </Reveal>
                    ))}
                </ol>
                <Reveal delay={120} className="mt-16">
                    <h2 className="text-2xl">{t("stack")}</h2>
                    <ul className="mt-5 flex flex-wrap gap-2">
                        {content.stack.map((item) => (
                            <li
                                key={item}
                                className="rounded-full border border-border bg-card/60 px-3 py-1.5 font-mono text-xs text-muted-foreground"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </Reveal>
            </section>

            <section className="wrap grid gap-12 py-16 lg:grid-cols-[1fr_1.6fr] lg:gap-20 md:py-24">
                <Reveal>
                    <h2 className="text-3xl md:text-5xl">{t("faq")}</h2>
                </Reveal>
                <FaqList items={content.faq} group={`faq-${content.key}`} />
            </section>

            <CtaBand title={t("ctaTitle")} text={t("ctaText", { service: content.title })} />

            <section className="wrap py-16 md:py-24">
                <h2 className="text-2xl">{t("otherServices")}</h2>
                <ul className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                    {others.map((key) => (
                        <li key={key}>
                            <Link
                                href={servicePath(key)}
                                className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                            >
                                {services(`${key}.title`)}
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
        </article>
    );
};
