import { useTranslations } from "next-intl";

import { ArrowUpRight } from "lucide-react";

import { type BrandCode, BRANDS, INSTALLATIONS } from "@workspace/brand";

import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";
import { SpotlightCard } from "@/modules/shared/ui/spotlight-card";

interface Product {
    /** Texts: `products.items.<key>`. */
    key: string;
    palette: readonly string[];
    /** Public address; none yet — the card shows `items.<key>.status`. */
    url: string | null;
}

/** Clean installations only: the club product stays apart from the studio (multi-niche rule). */
const OWN_BRANDS: readonly BrandCode[] = ["inkspace", "plisplas"];

const BITRIX_PALETTE = ["#2f54eb", "#00b8d9"] as const;

const PRODUCTS: readonly Product[] = [
    ...OWN_BRANDS.map((code) => ({
        key: code,
        palette: BRANDS[code].palette,
        url: INSTALLATIONS[code].released ? `https://${BRANDS[code].domains.site}` : null,
    })),
    { key: "bitrix", palette: BITRIX_PALETTE, url: null },
];

/** Products the studio owns and runs. */
export const Products = () => {
    const t = useTranslations("products");

    return (
        <section
            id="products"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
        >
            <SectionHeading eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
            <div className="grid gap-4 md:grid-cols-3">
                {PRODUCTS.map(({ key, url, palette }, index) => (
                    <Reveal key={key} delay={index * 90}>
                        <SpotlightCard className="flex h-full flex-col gap-4 p-6">
                            <span
                                className="h-1.5 w-16 rounded-full"
                                style={{
                                    background: `linear-gradient(90deg, ${palette.join(", ")})`,
                                }}
                            />
                            <div>
                                <p className="font-mono text-xs text-muted-foreground">
                                    {t(`items.${key}.kind`)}
                                </p>
                                <h3 className="mt-1 text-xl">{t(`items.${key}.name`)}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t(`items.${key}.text`)}
                            </p>
                            {url ? (
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary"
                                >
                                    {new URL(url).host}
                                    <ArrowUpRight className="size-4" />
                                </a>
                            ) : (
                                <p className="mt-auto pt-2 text-sm text-muted-foreground">
                                    {t(`items.${key}.status`)}
                                </p>
                            )}
                        </SpotlightCard>
                    </Reveal>
                ))}
            </div>
        </section>
    );
};
