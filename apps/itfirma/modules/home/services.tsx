import { useTranslations } from "next-intl";

import {
    Bot,
    Boxes,
    Globe,
    GraduationCap,
    LayoutDashboard,
    Plug,
    ServerCog,
    Smartphone,
} from "lucide-react";

import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";
import { SpotlightCard } from "@/modules/shared/ui/spotlight-card";

/** Keys of `services.items.<key>` in the messages; the order is the order on the page. */
const SERVICES = [
    { key: "web", Icon: Globe },
    { key: "apps", Icon: LayoutDashboard },
    { key: "mobile", Icon: Smartphone },
    { key: "bitrix", Icon: Boxes },
    { key: "integrations", Icon: Plug },
    { key: "ai", Icon: Bot },
    { key: "training", Icon: GraduationCap },
    { key: "devops", Icon: ServerCog },
] as const;

export const Services = () => {
    const t = useTranslations("services");

    return (
        <section
            id="services"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
        >
            <SectionHeading eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {SERVICES.map(({ key, Icon }, index) => (
                    <Reveal key={key} as="li" className="h-full" delay={(index % 4) * 70}>
                        <SpotlightCard className="flex h-full flex-col gap-4 p-6">
                            <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                                <Icon className="size-5" />
                            </span>
                            <h3 className="text-lg leading-snug">{t(`items.${key}.title`)}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t(`items.${key}.text`)}
                            </p>
                            <p className="mt-auto pt-2 font-mono text-xs text-muted-foreground">
                                {t(`items.${key}.stack`)}
                            </p>
                        </SpotlightCard>
                    </Reveal>
                ))}
            </ul>
        </section>
    );
};
