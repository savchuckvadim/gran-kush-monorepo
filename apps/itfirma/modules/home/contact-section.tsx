import { useTranslations } from "next-intl";

import { Mail } from "lucide-react";

import { LeadForm } from "@/modules/lead/lead-form";
import { CONTACT_EMAIL } from "@/modules/shared/config/site";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

export const ContactSection = () => {
    const t = useTranslations("contact");

    return (
        <section id="contact" className="scroll-mt-20 py-24 md:py-32">
            <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
                <div>
                    <SectionHeading title={t("title")} lead={t("lead")} />
                    <Reveal delay={120}>
                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="mt-8 inline-flex items-center gap-2 text-foreground underline-offset-4 hover:underline"
                        >
                            <Mail className="size-4 text-primary" />
                            {CONTACT_EMAIL}
                        </a>
                        <p className="mt-4 max-w-[45ch] text-sm text-muted-foreground">
                            {t("note")}
                        </p>
                    </Reveal>
                </div>
                <Reveal delay={160}>
                    <LeadForm />
                </Reveal>
            </div>
        </section>
    );
};
