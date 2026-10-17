"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { ValueLabels } from "./record-display";

/** "Yes" and "no" for boolean fields in the interface language. */
export function useValueLabels(): ValueLabels {
    const t = useTranslations("crm.records.values");
    return useMemo(() => ({ yes: t("yes"), no: t("no") }), [t]);
}
