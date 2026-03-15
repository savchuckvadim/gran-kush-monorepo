"use client";

import { useTranslations } from "next-intl";

import { AboutUsHero } from "./components/about-us-hero";
import { AboutUsPrinciplesGrid } from "./components/about-us-principles-grid";
import { AboutUsTextSection } from "./components/about-us-text-section";
import { AboutUsValuesCard } from "./components/about-us-values-card";
import { AboutUsPageContent, AboutUsPrinciple, AboutUsTranslationKey } from "./types";

function buildAboutUsContent(t: (key: AboutUsTranslationKey) => string): AboutUsPageContent {
    const principles: AboutUsPrinciple[] = [
        { title: t("principleOneTitle"), description: t("principleOneText") },
        { title: t("principleTwoTitle"), description: t("principleTwoText") },
        { title: t("principleThreeTitle"), description: t("principleThreeText") },
    ];

    const values: string[] = [
        t("valueOne"),
        t("valueTwo"),
        t("valueThree"),
        t("valueFour"),
        t("valueFive"),
        t("valueSix"),
    ];

    return {
        title: t("title"),
        subtitle: t("subtitle"),
        introTitle: t("introTitle"),
        introText: t("introText"),
        detailsTitle: t("detailsTitle"),
        detailsText: t("detailsText"),
        principlesTitle: t("principlesTitle"),
        principles,
        valuesTitle: t("valuesTitle"),
        values,
        footer: t("footer"),
    };
}

export function AboutUsPage() {
    const t = useTranslations("about-us");
    const content = buildAboutUsContent((key) => t(key));

    return (
        <div className="container min-w-full py-20">
            <div className="mx-auto max-w-4xl space-y-12">
                <AboutUsHero title={content.title} subtitle={content.subtitle} />
                <AboutUsTextSection
                    introTitle={content.introTitle}
                    introText={content.introText}
                    detailsTitle={content.detailsTitle}
                    detailsText={content.detailsText}
                />
                <AboutUsPrinciplesGrid
                    title={content.principlesTitle}
                    principles={content.principles}
                />
                <AboutUsValuesCard title={content.valuesTitle} values={content.values} />
                <p className="text-center text-muted-foreground">{content.footer}</p>
            </div>
        </div>
    );
}
