"use client";

import { useTranslations } from "next-intl";

import { FieldSelect } from "@workspace/ui";

import { useTaxRateLabel, useTaxRates } from "@/modules/entities/finance";
import { usePortalModuleEnabled } from "@/modules/entities/portal-modules";

export interface ProductTaxValue {
    taxRateId: string | null;
    priceIncludesTax: boolean | null;
}

/** «Как у клуба»: пустое значение — ставка по умолчанию и режим цены из профиля организации. */
const FOLLOW = "";

/**
 * Налог товара (TASK-797), только при включённых финансах клуба: своя ставка или ставка клуба по
 * умолчанию; цена с налогом, без налога (налог сверху) или как в настройках клуба.
 */
export function ProductTaxFields({
    value,
    onChange,
}: {
    value: ProductTaxValue;
    onChange: (next: ProductTaxValue) => void;
}) {
    const t = useTranslations("crm.products.tax");
    const enabled = usePortalModuleEnabled("finance") === true;
    const rates = useTaxRates({ enabled });
    const label = useTaxRateLabel();
    if (!enabled) return null;

    const fallback = rates.data?.find((rate) => rate.isDefault);
    const priceMode = value.priceIncludesTax === null ? FOLLOW : String(value.priceIncludesTax);

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <FieldSelect
                id="product-tax-rate"
                label={t("rate")}
                value={value.taxRateId ?? FOLLOW}
                options={[
                    {
                        value: FOLLOW,
                        label: fallback
                            ? t("rateDefault", { rate: label(fallback) })
                            : t("rateNone"),
                    },
                    ...(rates.data ?? []).map((rate) => ({ value: rate.id, label: label(rate) })),
                ]}
                onValueChange={(next) =>
                    onChange({ ...value, taxRateId: next === FOLLOW ? null : next })
                }
            />
            <FieldSelect
                id="product-price-mode"
                label={t("priceMode")}
                helperText={t("priceModeHint")}
                value={priceMode}
                options={[
                    { value: FOLLOW, label: t("priceFollow") },
                    { value: "true", label: t("priceIncluded") },
                    { value: "false", label: t("priceExcluded") },
                ]}
                onValueChange={(next) =>
                    onChange({
                        ...value,
                        priceIncludesTax: next === FOLLOW ? null : next === "true",
                    })
                }
            />
        </div>
    );
}
