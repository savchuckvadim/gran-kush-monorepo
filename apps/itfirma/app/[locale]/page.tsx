import { setRequestLocale } from "next-intl/server";

import { BitrixBand } from "@/modules/home/bitrix-band";
import { Cases } from "@/modules/home/cases";
import { ContactSection } from "@/modules/home/contact-section";
import { CtaBand } from "@/modules/home/cta-band";
import { FaqSection } from "@/modules/home/faq-section";
import { Hero } from "@/modules/home/hero";
import { InsightsTeaser } from "@/modules/home/insights-teaser";
import { Process } from "@/modules/home/process";
import { Products } from "@/modules/home/products";
import { Services } from "@/modules/home/services";
import { StackMarquee } from "@/modules/home/stack-marquee";
import { Team } from "@/modules/home/team";
import { JsonLd } from "@/modules/pages/json-ld";
import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";
import { HAS_PRODUCTS } from "@/modules/shared/config/products";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
    const { locale } = await params;
    const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
    setRequestLocale(lang);

    return (
        <>
            <JsonLd locale={lang} />
            <Hero />
            <StackMarquee />
            <Services />
            <BitrixBand />
            {HAS_PRODUCTS ? <Products /> : null}
            <Cases />
            <Process />
            <Team />
            <InsightsTeaser />
            <FaqSection />
            <CtaBand />
            <ContactSection />
        </>
    );
}
