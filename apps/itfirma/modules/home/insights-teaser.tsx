import { useLocale, useTranslations } from "next-intl";

import { ArrowUpRight } from "lucide-react";

import { getArticles } from "@/modules/content/articles";
import { ARTICLE_SLUGS, articlePath, INSIGHTS_PATH } from "@/modules/shared/config/articles";
import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";
import { Link } from "@/modules/shared/i18n/navigation";
import { CtaLink } from "@/modules/shared/ui/cta-link";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

/** The three articles, as a reading list next to a short invitation. */
export const InsightsTeaser = () => {
    const t = useTranslations("insights");
    const locale = useLocale();
    const articles = getArticles(isLocale(locale) ? locale : DEFAULT_LOCALE);

    return (
        <section id="insights" className="scroll-mt-20 py-24 md:py-32">
            <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <SectionHeading title={t("title")} lead={t("lead")} />
                    <Reveal delay={120}>
                        <div className="mt-8">
                            <CtaLink href={INSIGHTS_PATH} variant="secondary">
                                {t("all")}
                            </CtaLink>
                        </div>
                    </Reveal>
                </div>
                <ul className="divide-y divide-border border-y border-border">
                    {ARTICLE_SLUGS.map((slug, index) => {
                        const article = articles[slug];
                        return (
                            <Reveal key={slug} as="li" delay={index * 80}>
                                <Link
                                    href={articlePath(slug)}
                                    className="group grid gap-3 py-8 transition-colors hover:text-primary"
                                >
                                    <p className="text-sm text-muted-foreground">
                                        {t("reading", { minutes: article.readingMinutes })}
                                    </p>
                                    <h3 className="flex items-start justify-between gap-6 text-2xl leading-tight md:text-3xl">
                                        {article.title}
                                        <ArrowUpRight className="mt-1 size-6 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                                    </h3>
                                    <p className="max-w-[60ch] text-muted-foreground">
                                        {article.description}
                                    </p>
                                </Link>
                            </Reveal>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
};
