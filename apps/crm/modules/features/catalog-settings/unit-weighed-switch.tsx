"use client";

import { useTranslations } from "next-intl";

import type { SchemaMeasurementUnitDto } from "@workspace/api-client/core";
import { Switch } from "@workspace/ui";

import { useUpdateMeasurementUnit } from "@/modules/entities/measurement-unit";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

/** «Весовая» у единицы клуба: скан такого товара просит ввести количество, а не ставит 1. */
export function UnitWeighedSwitch({ unit }: { unit: SchemaMeasurementUnitDto }) {
    const t = useTranslations("crm.sections.settings.measurementUnits");
    const update = useUpdateMeasurementUnit();

    return (
        <Switch
            checked={unit.isWeighed}
            disabled={update.isPending}
            aria-label={t("fields.weighed")}
            onCheckedChange={(isWeighed) =>
                update.mutate(
                    { id: unit.id, data: { isWeighed } },
                    { onError: (error) => notifyApiError(error) }
                )
            }
        />
    );
}
