import { useTranslations } from "next-intl";

import {
    ArrowLeftRight,
    GraduationCap,
    type LucideIcon,
    PhoneCall,
    Puzzle,
    SquareKanban,
    Workflow,
} from "lucide-react";

import { servicePath } from "@/modules/shared/config/services";
import { CtaLink } from "@/modules/shared/ui/cta-link";
import { ThreadLines } from "@/modules/shared/ui/effects/thread-lines";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

/** Keys of `bitrix.points.<key>`, each with its icon, in page order. */
const POINTS: readonly { key: string; Icon: LucideIcon }[] = [
    { key: "crm", Icon: SquareKanban },
    { key: "automation", Icon: Workflow },
    { key: "telephony", Icon: PhoneCall },
    { key: "apps", Icon: Puzzle },
    { key: "migration", Icon: ArrowLeftRight },
    { key: "training", Icon: GraduationCap },
];

/** The service the studio knows deepest, laid out as six points over moving threads. */
export const BitrixBand = () => {
    const t = useTranslations("bitrix");
    const cta = useTranslations("cta");

    return (
        <section className="relative isolate overflow-hidden py-16 md:py-32">
            <ThreadLines className="fade-y -z-10" />
            <div className="wrap">
                <SectionHeading kicker={t("kicker")} title={t("title")} lead={t("lead")} />
                <ul className="mt-12 grid gap-x-10 gap-y-10 border-t border-border pt-10 md:mt-14 md:grid-cols-3">
                    {POINTS.map(({ key, Icon }, index) => (
                        <Reveal key={key} as="li" delay={(index % 3) * 80}>
                            <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                                <Icon className="size-5" />
                            </span>
                            <h3 className="mt-4 text-lg md:text-xl">{t(`points.${key}.title`)}</h3>
                            <p className="mt-2 max-w-[40ch] text-muted-foreground">
                                {t(`points.${key}.text`)}
                            </p>
                        </Reveal>
                    ))}
                </ul>
                <Reveal delay={200}>
                    <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 md:mt-14">
                        <CtaLink>{cta("request")}</CtaLink>
                        <CtaLink href={servicePath("bitrix")} variant="ghost">
                            {t("more")}
                        </CtaLink>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
