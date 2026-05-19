"use client";

import * as React from "react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { readJsonArrayFromCookie, writeJsonArrayToCookie } from "../../lib/entity-list-prefs-cookie";
import { useIsMobile } from "../../lib/use-is-mobile";

import { EntityListCardsView } from "./components/EntityListCardsView";
import { EntityListPagination } from "./components/EntityListPagination";
import { EntityListTableView } from "./components/EntityListTableView";
import { EntityListVisibilitySettingsDialog } from "./components/EntityListVisibilitySettingsDialog";

export type EntityListViewMode = "cards" | "table";

export type EntityListOnPageChange = (page: number) => void;

export interface EntityListPaginationProps {
    page: number;
    totalPages: number;
    pageSize?: number;
    totalCount?: number;
    pageSizeOptions?: number[];
    onPageChange: EntityListOnPageChange;
    onPageSizeChange?: (pageSize: number) => void;
}

export interface EntityListTableColumn<T> {
    key: string;
    header: React.ReactNode;
    cell: (item: T) => React.ReactNode;
    headClassName?: string;
    cellClassName?: string;
}

export interface EntityListCardField<T> {
    key: string;
    label: React.ReactNode;
    value: (item: T) => React.ReactNode;
}

export interface EntityListProps<T> {
    items: T[];
    loading?: boolean;
    error?: React.ReactNode;
    emptyState?: React.ReactNode;

    getRowKey: (item: T) => string;

    title?: React.ReactNode;

    filterSlot?: React.ReactNode;
    reserveFilterSpace?: boolean;

    pagination?: EntityListPaginationProps;

    defaultViewMode?: EntityListViewMode; // default = "cards"
    enableViewToggle?: boolean; // default = true

    /** Имя ключа (суффикс cookie); без префикса приложения */
    viewModeStorageKey?: string;

    // Row click
    isRowClickable?: boolean;
    onRowClick?: (item: T) => void;

    // Card-specific click
    isCardClickable?: boolean;
    onCardClick?: (item: T) => void;

    // Actions
    renderCardActions?: (item: T) => React.ReactNode;
    renderRowActions?: (item: T) => React.ReactNode;

    showCardActionsColumn?: boolean; // kept for future extension
    showRowActionsColumn?: boolean; // if renderRowActions exists but this is false => hide column

    // Table config
    tableColumns?: EntityListTableColumn<T>[];
    defaultVisibleTableColumnKeys?: string[];

    // Card config
    cardFields?: EntityListCardField<T>[];
    defaultVisibleCardFieldKeys?: string[];

    enableVisibilitySettings?: boolean; // default = true
    visibilityStorageKey?: string;
}

function uniq<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

export function EntityList<T>({
    items,
    loading,
    error,
    emptyState,

    getRowKey,

    title,

    filterSlot,
    reserveFilterSpace = true,

    pagination,

    defaultViewMode = "cards",
    enableViewToggle = true,
    viewModeStorageKey,

    isRowClickable,
    onRowClick,
    isCardClickable,
    onCardClick,

    renderCardActions,
    renderRowActions,
    showRowActionsColumn = true,

    tableColumns,
    defaultVisibleTableColumnKeys,
    cardFields,
    defaultVisibleCardFieldKeys,

    enableVisibilitySettings = true,
    visibilityStorageKey,
}: EntityListProps<T>) {
    const isMobile = useIsMobile();

    const coerceViewMode = (v: string | undefined, fallback: EntityListViewMode): EntityListViewMode =>
        v === "table" || v === "cards" ? v : fallback;

    const viewStorageKey = viewModeStorageKey ? `${viewModeStorageKey}:view` : null;
    const [viewMode, setViewMode] = React.useState<EntityListViewMode>(() => {
        const fallback = isMobile ? "cards" : defaultViewMode;
        if (typeof document !== "undefined" && viewStorageKey) {
            const raw = readJsonArrayFromCookie(viewStorageKey, [fallback])[0];
            return coerceViewMode(raw, fallback);
        }
        return fallback;
    });

    React.useEffect(() => {
        if (!viewStorageKey) return;
        writeJsonArrayToCookie(viewStorageKey, [viewMode]);
    }, [viewMode, viewStorageKey]);

    const resolvedTableColumns = tableColumns ?? [];
    const resolvedCardFields =
        cardFields ??
        (resolvedTableColumns.length
            ? resolvedTableColumns.map((c) => ({
                  key: c.key,
                  label: c.header,
                  value: (item: T) => c.cell(item),
              }))
            : []);

    const storageTableColumnsKey = visibilityStorageKey
        ? `${visibilityStorageKey}:tableColumns`
        : null;
    const storageCardFieldsKey = visibilityStorageKey ? `${visibilityStorageKey}:cardFields` : null;

    const defaultTableKeys =
        defaultVisibleTableColumnKeys ?? resolvedTableColumns.map((c) => c.key);
    const defaultCardKeys = defaultVisibleCardFieldKeys ?? resolvedCardFields.map((f) => f.key);

    const [visibleTableColumnKeys, setVisibleTableColumnKeys] = React.useState<string[]>(() =>
        storageTableColumnsKey
            ? readJsonArrayFromCookie(storageTableColumnsKey, defaultTableKeys)
            : uniq(defaultTableKeys)
    );
    const [visibleCardFieldKeys, setVisibleCardFieldKeys] = React.useState<string[]>(() =>
        storageCardFieldsKey
            ? readJsonArrayFromCookie(storageCardFieldsKey, defaultCardKeys)
            : uniq(defaultCardKeys)
    );

    React.useEffect(() => {
        if (!storageTableColumnsKey) return;
        writeJsonArrayToCookie(storageTableColumnsKey, visibleTableColumnKeys);
    }, [storageTableColumnsKey, visibleTableColumnKeys]);

    React.useEffect(() => {
        if (!storageCardFieldsKey) return;
        writeJsonArrayToCookie(storageCardFieldsKey, visibleCardFieldKeys);
    }, [storageCardFieldsKey, visibleCardFieldKeys]);

    const visibleColumns = resolvedTableColumns.filter((c) =>
        visibleTableColumnKeys.includes(c.key)
    );
    const visibleFields = resolvedCardFields.filter((f) => visibleCardFieldKeys.includes(f.key));

    const toggleKey = (key: string, setState: React.Dispatch<React.SetStateAction<string[]>>) => {
        setState((prev) => {
            const exists = prev.includes(key);
            if (exists) {
                return prev.filter((x) => x !== key);
            }
            return uniq([...prev, key]);
        });
    };

    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    return (
        <div className="w-full">
            {filterSlot ? (
                <div className="mb-3">{filterSlot}</div>
            ) : reserveFilterSpace ? (
                <div className="mb-3 h-12" />
            ) : null}

            {(title || enableViewToggle || enableVisibilitySettings) && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    {title ? <div className="text-base font-semibold">{title}</div> : <div />}

                    <div className="flex items-center gap-2">
                        {enableVisibilitySettings &&
                            visibilityStorageKey &&
                            (resolvedTableColumns.length || resolvedCardFields.length) && (
                                <EntityListVisibilitySettingsDialog
                                    isOpen={isSettingsOpen}
                                    onOpenChange={setIsSettingsOpen}
                                    resolvedCardFields={resolvedCardFields.map((field) => ({
                                        key: field.key,
                                        label: field.label,
                                    }))}
                                    resolvedTableColumns={resolvedTableColumns.map((col) => ({
                                        key: col.key,
                                        header: col.header,
                                    }))}
                                    visibleCardFieldKeys={visibleCardFieldKeys}
                                    visibleTableColumnKeys={visibleTableColumnKeys}
                                    onToggleCardFieldKey={(key) =>
                                        toggleKey(key, setVisibleCardFieldKeys)
                                    }
                                    onToggleTableColumnKey={(key) =>
                                        toggleKey(key, setVisibleTableColumnKeys)
                                    }
                                />
                            )}

                        {enableViewToggle && (
                            <div className="inline-flex overflow-hidden rounded-lg border bg-background">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "rounded-none border-0",
                                        viewMode === "cards" && "bg-muted"
                                    )}
                                    onClick={() => setViewMode("cards")}
                                >
                                    Карточки
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "rounded-none border-0",
                                        viewMode === "table" && "bg-muted"
                                    )}
                                    onClick={() => setViewMode("table")}
                                >
                                    Таблица
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Загрузка...
                </div>
            ) : error ? (
                <div className="py-4 text-destructive">{error}</div>
            ) : items.length === 0 ? (
                (emptyState ?? (
                    <div className="py-8 text-center text-muted-foreground">Ничего не найдено</div>
                ))
            ) : viewMode === "table" ? (
                <EntityListTableView
                    items={items}
                    getRowKey={getRowKey}
                    visibleColumns={visibleColumns}
                    isRowClickable={isRowClickable}
                    onRowClick={onRowClick}
                    renderRowActions={renderRowActions}
                    showRowActionsColumn={showRowActionsColumn}
                />
            ) : (
                <EntityListCardsView
                    items={items}
                    getRowKey={getRowKey}
                    visibleFields={visibleFields}
                    isCardClickable={isCardClickable}
                    onCardClick={onCardClick}
                    renderCardActions={renderCardActions}
                />
            )}

            {pagination ? <EntityListPagination pagination={pagination} /> : null}
        </div>
    );
}
