import { useTranslations } from "next-intl";

import { Mail } from "lucide-react";

import { LeadForm } from "@/modules/lead/lead-form";
import { CONTACT_EMAIL } from "@/modules/shared/config/site";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

export const ContactSection = () => {
    const t = useTranslations("contact");

    return (
        <section
            id="contact"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
        >
            <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
                <div>
                    <SectionHeading eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
                    <Reveal delay={120}>
                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="inline-flex items-center gap-2 text-sm text-foreground underline-offset-4 hover:underline"
                        >
                            <Mail className="size-4 text-primary" />
                            {CONTACT_EMAIL}
                        </a>
                        <p className="mt-3 max-w-sm text-xs text-muted-foreground">{t("note")}</p>
                    </Reveal>
                </div>
                <Reveal delay={160}>
                    <LeadForm />
                </Reveal>
            </div>
        </section>
    );
};
