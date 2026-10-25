import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getArticle } from "@/modules/content/articles";
import { ArticlePage } from "@/modules/insights/article-page";
import { ARTICLE_SLUGS, isArticleSlug } from "@/modules/shared/config/articles";
import { isLocale, LOCALES } from "@/modules/shared/config/locales";
import { absoluteUrl, OWNER, SITE_NAME } from "@/modules/shared/config/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const generateStaticParams = () =>
    LOCALES.flatMap((locale) => ARTICLE_SLUGS.map((slug) => ({ locale, slug })));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, slug } = await params;
    if (!isLocale(locale) || !isArticleSlug(slug)) return {};
    const article = getArticle(locale, slug);
    return {
        title: article.title,
        description: article.description,
        alternates: {
            canonical: `/${locale}/insights/${slug}`,
            languages: Object.fromEntries(
                LOCALES.map((item) => [item, `/${item}/insights/${slug}`])
            ),
        },
        openGraph: {
            type: "article",
            title: article.title,
            description: article.description,
            publishedTime: article.date,
            url: absoluteUrl(`/${locale}/insights/${slug}`),
        },
    };
}

export default async function Page({ params }: Props) {
    const { locale, slug } = await params;
    if (!isLocale(locale) || !isArticleSlug(slug)) notFound();
    setRequestLocale(locale);
    const article = getArticle(locale, slug);
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: article.date,
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME, founder: OWNER.name },
        inLanguage: locale,
        url: absoluteUrl(`/${locale}/insights/${slug}`),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ArticlePage article={article} />
        </>
    );
}
