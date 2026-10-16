"use client";

import { useTranslations } from "next-intl";

import type { SchemaProductAudience } from "@workspace/api-client/core";

export const PRODUCT_AUDIENCES: readonly SchemaProductAudience[] = ["medical", "mj", "recreation"];

interface AudiencePickerProps {
    value: readonly SchemaProductAudience[];
    onChange: (value: SchemaProductAudience[]) => void;
}

/**
 * Кому товар виден в кабинете. Ничего не отмечено — всем участникам; отмечено — только тем,
 * кому клуб поставил этот флаг в анкете.
 */
export function AudiencePicker({ value, onChange }: AudiencePickerProps) {
    const t = useTranslations("crm.products.audiences");
    const toggle = (audience: SchemaProductAudience, on: boolean) =>
        onChange(on ? [...value, audience] : value.filter((selected) => selected !== audience));

    return (
        <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("label")}</legend>
            <div className="flex flex-wrap gap-4">
                {PRODUCT_AUDIENCES.map((audience) => (
                    <label key={audience} className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={value.includes(audience)}
                            onChange={(event) => toggle(audience, event.target.checked)}
                        />
                        {t(audience)}
                    </label>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </fieldset>
    );
}
