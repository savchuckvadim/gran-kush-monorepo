import { setRequestLocale } from "next-intl/server";

import { About } from "@/modules/home/about";
import { ContactSection } from "@/modules/home/contact-section";
import { Hero } from "@/modules/home/hero";
import { Process } from "@/modules/home/process";
import { Products } from "@/modules/home/products";
import { Services } from "@/modules/home/services";
import { StackMarquee } from "@/modules/home/stack-marquee";
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
            {HAS_PRODUCTS ? <Products /> : null}
            <Process />
            <About />
            <ContactSection />
        </>
    );
}
