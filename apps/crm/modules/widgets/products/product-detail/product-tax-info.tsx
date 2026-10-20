"use client";

import { useTranslations } from "next-intl";

import type { SchemaProductDetailDto } from "@workspace/api-client/core";

import { useTaxRateLabel, useTaxRates } from "@/modules/entities/finance";
import { usePortalModuleEnabled } from "@/modules/entities/portal-modules";

import { InfoRow } from "./info-row";

/** Налог товара в просмотре: ставка (или ставка клуба по умолчанию) и как считается цена. */
export function ProductTaxInfo({ product }: { product: SchemaProductDetailDto }) {
    const t = useTranslations("crm.products.tax");
    const enabled = usePortalModuleEnabled("finance") === true;
    const rates = useTaxRates({ enabled });
    const label = useTaxRateLabel();
    if (!enabled || !rates.data) return null;

    const own = rates.data.find((rate) => rate.id === product.taxRateId);
    const fallback = rates.data.find((rate) => rate.isDefault);
    const rate = own
        ? label(own)
        : fallback
          ? t("rateDefault", { rate: label(fallback) })
          : t("rateNone");
    const mode =
        product.priceIncludesTax === null
            ? t("priceFollow")
            : product.priceIncludesTax
              ? t("priceIncluded")
              : t("priceExcluded");

    return <InfoRow label={t("label")} value={`${rate} · ${mode}`} />;
}
