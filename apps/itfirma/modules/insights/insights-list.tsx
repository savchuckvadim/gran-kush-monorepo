import { useLocale, useTranslations } from "next-intl";

import { ArrowUpRight } from "lucide-react";

import { getArticles } from "@/modules/content/articles";
import { CtaBand } from "@/modules/home/cta-band";
import { ARTICLE_SLUGS, articlePath } from "@/modules/shared/config/articles";
import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";
import { Link } from "@/modules/shared/i18n/navigation";
import { Reveal } from "@/modules/shared/ui/reveal";

/** Every article, newest first, as a reading list. */
export const InsightsList = () => {
    const t = useTranslations("insights");
    const locale = useLocale();
    const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
    const articles = getArticles(lang);
    const ordered = [...ARTICLE_SLUGS].sort((a, b) =>
        articles[b].date.localeCompare(articles[a].date)
    );
    const format = new Intl.DateTimeFormat(lang, { dateStyle: "long" });

    return (
        <>
            <section className="wrap pt-16 pb-12 md:pt-24">
                <h1 className="max-w-3xl text-4xl leading-[1.05] md:text-6xl">{t("pageTitle")}</h1>
                <p className="mt-6 max-w-[60ch] text-lg text-muted-foreground">{t("pageLead")}</p>
            </section>
            <section className="wrap pb-16 md:pb-24">
                <ul className="divide-y divide-border border-y border-border">
                    {ordered.map((slug, index) => {
                        const article = articles[slug];
                        return (
                            <Reveal key={slug} as="li" delay={index * 60}>
                                <Link
                                    href={articlePath(slug)}
                                    className="group grid gap-4 py-10 transition-colors hover:text-primary lg:grid-cols-[12rem_1fr] lg:gap-12"
                                >
                                    <p className="text-sm text-muted-foreground">
                                        {format.format(new Date(`${article.date}T12:00:00Z`))}
                                        <br />
                                        {t("reading", { minutes: article.readingMinutes })}
                                    </p>
                                    <div>
                                        <h2 className="flex items-start justify-between gap-6 text-2xl leading-tight md:text-4xl">
                                            {article.title}
                                            <ArrowUpRight className="mt-1 size-6 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                                        </h2>
                                        <p className="mt-4 max-w-[65ch] text-lg text-muted-foreground">
                                            {article.description}
                                        </p>
                                    </div>
                                </Link>
                            </Reveal>
                        );
                    })}
                </ul>
            </section>
            <CtaBand />
        </>
    );
};
