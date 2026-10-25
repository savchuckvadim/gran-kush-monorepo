import { useLocale, useTranslations } from "next-intl";

import type { ArticleContent } from "@/modules/content/types";
import { CtaBand } from "@/modules/home/cta-band";
import { INSIGHTS_PATH } from "@/modules/shared/config/articles";
import { servicePath } from "@/modules/shared/config/services";
import { Link } from "@/modules/shared/i18n/navigation";
import { CtaLink } from "@/modules/shared/ui/cta-link";

interface ArticlePageProps {
    article: ArticleContent;
}

/** A long read: title and facts of the piece, the text itself, then the service it belongs to. */
export const ArticlePage = ({ article }: ArticlePageProps) => {
    const t = useTranslations("article");
    const insights = useTranslations("insights");
    const services = useTranslations("services.items");
    const locale = useLocale();
    const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        new Date(`${article.date}T12:00:00Z`)
    );

    return (
        <article>
            <header className="wrap pt-16 pb-12 md:pt-24">
                <p className="text-sm text-primary">
                    <Link href={INSIGHTS_PATH} className="hover:underline">
                        {t("back")}
                    </Link>
                </p>
                <h1 className="mt-4 max-w-4xl text-4xl leading-[1.05] md:text-6xl">
                    {article.title}
                </h1>
                <p className="mt-6 text-sm text-muted-foreground">
                    {date} · {insights("reading", { minutes: article.readingMinutes })}
                </p>
            </header>
            <div className="wrap grid gap-12 pb-16 lg:grid-cols-[1fr_18rem] lg:gap-20 md:pb-24">
                <div className="prose-article max-w-[68ch] text-lg text-muted-foreground">
                    <p className="text-xl text-foreground">{article.intro}</p>
                    {article.sections.map((section) => (
                        <section key={section.heading}>
                            <h2 className="text-foreground">{section.heading}</h2>
                            {section.paragraphs.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                            {section.bullets ? (
                                <ul>
                                    {section.bullets.map((bullet) => (
                                        <li key={bullet}>{bullet}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </section>
                    ))}
                    <p className="text-foreground">{article.outro}</p>
                </div>
                <aside className="lg:sticky lg:top-28 lg:self-start">
                    <div className="surface p-6">
                        <p className="text-sm text-muted-foreground">{t("related")}</p>
                        <p className="mt-2 text-xl">
                            {services(`${article.relatedService}.title`)}
                        </p>
                        <div className="mt-5">
                            <CtaLink href={servicePath(article.relatedService)} variant="secondary">
                                {t("openService")}
                            </CtaLink>
                        </div>
                    </div>
                </aside>
            </div>
            <CtaBand />
        </article>
    );
};
