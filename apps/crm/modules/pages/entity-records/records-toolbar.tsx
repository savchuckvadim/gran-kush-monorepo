"use client";

import { useTranslations } from "next-intl";

import type { EntityStageCategory } from "@/modules/entities/entity-settings";
import { EntityFilter } from "@/modules/shared/ui/EntityFilter";
import { FunnelSelect } from "@/modules/shared/ui/FunnelSelect";

import type { RecordFilters } from "./use-record-filters";

interface RecordsToolbarProps {
    code: string;
    funnels: readonly EntityStageCategory[];
    funnelId: string | undefined;
    onFunnelChange: (funnelId: string) => void;
    filters: RecordFilters;
    total?: number;
    isFetching?: boolean;
}

/** The funnel and the filter side by side: the same bar over the table and over the kanban. */
export function RecordsToolbar({
    code,
    funnels,
    funnelId,
    onFunnelChange,
    filters,
    total,
    isFetching,
}: RecordsToolbarProps) {
    const t = useTranslations("crm.records");

    return (
        <div className="flex flex-wrap items-center gap-2">
            {funnelId ? (
                <FunnelSelect funnels={funnels} value={funnelId} onChange={onFunnelChange} />
            ) : null}
            <EntityFilter
                fields={filters.fields}
                state={filters.state}
                onChange={filters.setState}
                total={total}
                isFetching={isFetching}
                storageKey={`crm-records-${code}`}
                searchPlaceholder={t("searchPlaceholder")}
                className="min-w-0 flex-1"
            />
        </div>
    );
}
