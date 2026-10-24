import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LEGAL_CONTENT } from "@/modules/legal/content";
import { LEGAL_VERSION } from "@/modules/legal/types";
import { isLocale, LOCALES } from "@/modules/shared/config/locales";
import { isLegalDoc, LEGAL_DOCS } from "@/modules/shared/config/routes";

type Props = { params: Promise<{ locale: string; doc: string }> };

export const generateStaticParams = () =>
    LOCALES.flatMap((locale) => LEGAL_DOCS.map((doc) => ({ locale, doc })));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, doc } = await params;
    if (!isLocale(locale) || !isLegalDoc(doc)) return {};
    return {
        title: LEGAL_CONTENT[locale][doc].title,
        alternates: {
            canonical: `/${locale}/legal/${doc}`,
            languages: Object.fromEntries(LOCALES.map((item) => [item, `/${item}/legal/${doc}`])),
        },
    };
}

export default async function LegalPage({ params }: Props) {
    const { locale, doc } = await params;
    if (!isLocale(locale) || !isLegalDoc(doc)) notFound();
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: "legal" });
    const content = LEGAL_CONTENT[locale][doc];
    const version = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        new Date(`${LEGAL_VERSION}T12:00:00Z`)
    );

    return (
        <article className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
            <p className="font-mono text-xs text-muted-foreground">
                {t("updated", { date: version })}
            </p>
            <h1 className="mt-3 text-3xl md:text-5xl">{content.title}</h1>
            <div className="mt-10 space-y-10">
                {content.sections.map((section) => (
                    <section key={section.heading}>
                        <h2 className="text-xl">{section.heading}</h2>
                        <div className="mt-3 space-y-3 text-muted-foreground">
                            {section.paragraphs.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </article>
    );
}
