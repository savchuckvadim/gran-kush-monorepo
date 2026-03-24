"use client";

import * as React from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@workspace/ui";

import type { EntityListPaginationProps } from "../EntityList";

export function EntityListPagination({ pagination }: { pagination: EntityListPaginationProps }) {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
                Страница {pagination.page} / {pagination.totalPages}
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => pagination.onPageChange(pagination.page + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                {pagination.pageSizeOptions?.length && pagination.onPageSizeChange ? (
                    <select
                        value={String(pagination.pageSize ?? pagination.pageSizeOptions[0])}
                        onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                        className="rounded-md border bg-background px-2 py-1 text-sm"
                    >
                        {pagination.pageSizeOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                ) : null}
            </div>
        </div>
    );
}

