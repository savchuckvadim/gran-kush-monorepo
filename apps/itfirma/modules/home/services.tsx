import { useTranslations } from "next-intl";

import { ArrowUpRight } from "lucide-react";

import {
    FEATURED_SERVICES,
    SERVICE_KEYS,
    type ServiceKey,
    servicePath,
} from "@/modules/shared/config/services";
import { Link } from "@/modules/shared/i18n/navigation";
import { DotGrid } from "@/modules/shared/ui/effects/dot-grid";
import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

/** Where each tile sits in the four-column grid: the two featured services take more room. */
const TILE_CLASS: Record<ServiceKey, string> = {
    bitrix: "lg:col-span-2 lg:row-span-2",
    web: "",
    mobile: "",
    integrations: "",
    ai: "",
    apps: "lg:col-span-2",
    aiAdoption: "",
    devops: "",
};

/** Keys in visual order of the grid (row by row). */
const ORDER: readonly ServiceKey[] = [
    "bitrix",
    "web",
    "mobile",
    "integrations",
    "ai",
    "apps",
    "aiAdoption",
    "devops",
];

/** Eight services as a bento of links; dots behind them wake up under the mouse. */
export const Services = () => {
    const t = useTranslations("services");
    const missing = SERVICE_KEYS.filter((key) => !ORDER.includes(key));

    return (
        <section id="services" className="relative scroll-mt-20 py-16 md:py-32">
            <DotGrid className="fade-y -z-10" />
            <div className="wrap">
                <SectionHeading title={t("title")} lead={t("lead")} size="lg" />
                <ul className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3">
                    {[...ORDER, ...missing].map((key, index) => {
                        const featured = FEATURED_SERVICES.includes(key);
                        return (
                            <Reveal
                                key={key}
                                as="li"
                                className={TILE_CLASS[key]}
                                delay={(index % 4) * 60}
                            >
                                <Link
                                    href={servicePath(key)}
                                    className={[
                                        "surface group flex h-full flex-col justify-between gap-6 p-6 transition-transform hover:-translate-y-0.5 md:p-7",
                                        featured ? "tile-featured min-h-64" : "min-h-48",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <h3
                                            className={
                                                featured
                                                    ? "text-2xl leading-tight md:text-3xl"
                                                    : "text-lg leading-snug md:text-xl"
                                            }
                                        >
                                            {t(`items.${key}.title`)}
                                        </h3>
                                        <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                                    </div>
                                    <div>
                                        <p
                                            className={[
                                                "text-muted-foreground",
                                                featured ? "max-w-md text-base" : "text-sm",
                                            ].join(" ")}
                                        >
                                            {t(`items.${key}.text`)}
                                        </p>
                                        <p className="mt-4 font-mono text-xs text-muted-foreground">
                                            {t(`items.${key}.stack`)}
                                        </p>
                                    </div>
                                </Link>
                            </Reveal>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
};
