import { useTranslations } from "next-intl";

import type { FaqItem } from "@/modules/content/types";
import { FaqList } from "@/modules/shared/ui/faq-list";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

/** Keys of `faq.items.<key>` in the messages, in page order. */
const QUESTIONS = [
    "cost",
    "time",
    "start",
    "ownership",
    "support",
    "remote",
    "stack",
    "small",
] as const;

/** The questions a first call usually opens with, answered once for everyone. */
export const FaqSection = () => {
    const t = useTranslations("faq");
    const items: FaqItem[] = QUESTIONS.map((key) => ({
        question: t(`items.${key}.question`),
        answer: t(`items.${key}.answer`),
    }));
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
    };

    return (
        <section id="faq" className="scroll-mt-20 py-16 md:py-32">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <SectionHeading title={t("title")} lead={t("lead")} />
                </div>
                <FaqList items={items} group="home-faq" />
            </div>
        </section>
    );
};
