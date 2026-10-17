"use client";

import { useTranslations } from "next-intl";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui";

import {
    type EntityRecord,
    type RecordsFilter,
    useEntityRecords,
    useMoveEntityRecord,
} from "@/modules/entities/entity-records";
import { EntityList, type EntityListTableColumn } from "@/modules/shared/ui/EntityList";

import { recordFacts, recordTitle } from "./record-display";
import { type EntityStage, StageSelect } from "./stage-select";
import { useValueLabels } from "./use-value-labels";

const PAGE_SIZE = 20;

interface RecordsListProps {
    code: string;
    /** The chosen funnel; none — the entity has no funnels, every record is listed */
    funnelId: string | undefined;
    /** The stages of that funnel, for the stage picked in a row */
    stages: readonly EntityStage[];
    filter: RecordsFilter;
    page: number;
    onPageChange: (page: number) => void;
    /** Waits for the filter fields of a link that carries conditions */
    enabled: boolean;
    renderToolbar: (info: { total?: number; isFetching: boolean }) => ReactNode;
    canMove: boolean;
    canDelete: boolean;
    onOpen: (record: EntityRecord) => void;
    onDelete: (record: EntityRecord) => void;
}

/** The records of a funnel as a table (cards on a phone); a row opens the record. */
export function RecordsList({
    code,
    funnelId,
    stages,
    filter,
    page,
    onPageChange,
    enabled,
    renderToolbar,
    canMove,
    canDelete,
    onOpen,
    onDelete,
}: RecordsListProps) {
    const t = useTranslations("crm.records");
    const labels = useValueLabels();
    const { mutate: move } = useMoveEntityRecord(code);

    const { data, isPending, isFetching, error } = useEntityRecords(
        code,
        { ...filter, stageCategoryId: funnelId, limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE },
        enabled
    );

    const changeStage = (record: EntityRecord, stageId: string) => {
        const target = stages.find((stage) => stage.id === stageId);
        if (!target || record.stage?.id === stageId) return;
        move(
            {
                record,
                target: {
                    id: target.id,
                    stageCategoryId: target.stageCategoryId,
                    name: target.name,
                    color: target.color ?? null,
                    semantic: target.semantic,
                },
            },
            { onError: () => toast.error(t("moveError")) }
        );
    };

    const factsText = (record: EntityRecord): string =>
        recordFacts(record, labels)
            .map((fact) => `${fact.label}: ${fact.text}`)
            .join(" · ");

    const tableColumns: EntityListTableColumn<EntityRecord>[] = [
        {
            key: "title",
            header: t("table.record"),
            cell: (record) => <span className="font-medium">{recordTitle(record)}</span>,
        },
        {
            key: "stage",
            header: t("table.stage"),
            cell: (record) =>
                canMove && stages.length > 0 ? (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <StageSelect
                            className="text-xs"
                            stages={stages}
                            value={record.stage?.id ?? ""}
                            onChange={(stageId) => changeStage(record, stageId)}
                        />
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">
                        {record.stage?.name ?? "—"}
                    </span>
                ),
        },
        {
            key: "facts",
            header: t("table.fields"),
            cell: (record) => (
                <span className="text-xs text-muted-foreground">{factsText(record)}</span>
            ),
        },
    ];

    const deleteAction = canDelete
        ? (record: EntityRecord) => (
              <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("delete")}
                  title={t("delete")}
                  className="text-destructive"
                  onClick={() => onDelete(record)}
              >
                  <Trash2 className="size-4" aria-hidden="true" />
              </Button>
          )
        : undefined;

    return (
        <EntityList<EntityRecord>
            items={data?.items ?? []}
            loading={isPending && enabled}
            error={error ? t("loadError") : undefined}
            emptyState={
                <p className="text-muted-foreground py-8 text-center text-sm">{t("table.empty")}</p>
            }
            filterSlot={renderToolbar({ total: data?.total, isFetching })}
            getRowKey={(record) => record.id}
            tableColumns={tableColumns}
            defaultViewMode="table"
            viewModeStorageKey={`records-${code}`}
            visibilityStorageKey={`records-${code}`}
            isRowClickable
            onRowClick={onOpen}
            renderRowActions={deleteAction}
            cardTitle={(record) => recordTitle(record)}
            cardFields={[
                {
                    key: "stage",
                    label: t("table.stage"),
                    value: (record) => record.stage?.name ?? "—",
                },
                { key: "facts", label: t("table.fields"), value: factsText },
            ]}
            defaultVisibleCardFieldKeys={["stage", "facts"]}
            isCardClickable
            onCardClick={onOpen}
            renderCardActions={deleteAction}
            pagination={{
                page,
                totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE)),
                totalCount: data?.total,
                onPageChange,
            }}
        />
    );
}
