"use client";

import * as React from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

import type { EntityListTableColumn } from "../EntityList";

export function EntityListTableView<T>({
    items,
    getRowKey,
    visibleColumns,
    isRowClickable,
    onRowClick,
    renderRowActions,
    showRowActionsColumn,
}: {
    items: T[];
    getRowKey: (item: T) => string;
    visibleColumns: EntityListTableColumn<T>[];
    isRowClickable?: boolean;
    onRowClick?: (item: T) => void;
    renderRowActions?: (item: T) => React.ReactNode;
    showRowActionsColumn?: boolean;
}) {
    const canTableClick = Boolean(onRowClick && isRowClickable);
    const canRenderActions = Boolean(renderRowActions && showRowActionsColumn);

    return (
        <div className="w-full">
            <div className="overflow-x-auto max-w-full">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {visibleColumns.map((col) => (
                                <TableHead key={col.key} className={col.headClassName}>
                                    {col.header}
                                </TableHead>
                            ))}
                            {canRenderActions && <TableHead className="text-right">Действия</TableHead>}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {items.map((item) => (
                            <TableRow
                                key={getRowKey(item)}
                                onClick={canTableClick ? () => onRowClick?.(item) : undefined}
                                className={cn(canTableClick && "cursor-pointer")}
                            >
                                {visibleColumns.map((col) => (
                                    <TableCell key={col.key} className={col.cellClassName}>
                                        {col.cell(item)}
                                    </TableCell>
                                ))}

                                {renderRowActions && showRowActionsColumn && (
                                    <TableCell className="text-right">
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            className="flex items-center justify-end gap-1"
                                        >
                                            {renderRowActions(item)}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

