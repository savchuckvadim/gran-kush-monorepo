"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button, FieldSelect } from "@workspace/ui";

import type { EntityListPaginationProps } from "../EntityList";

export function EntityListPagination({ pagination }: { pagination: EntityListPaginationProps }) {
    const t = useTranslations("crm.entityList");
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
                {t("page", { page: pagination.page, total: pagination.totalPages })}
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    aria-label={t("previous")}
                    disabled={pagination.page <= 1}
                    onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    aria-label={t("next")}
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => pagination.onPageChange(pagination.page + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                {pagination.pageSizeOptions?.length && pagination.onPageSizeChange ? (
                    <FieldSelect
                        size="sm"
                        className="w-auto"
                        aria-label={t("pageSize")}
                        options={pagination.pageSizeOptions.map((opt) => ({
                            value: String(opt),
                            label: opt,
                        }))}
                        value={String(pagination.pageSize ?? pagination.pageSizeOptions[0])}
                        onValueChange={(value) => pagination.onPageSizeChange?.(Number(value))}
                    />
                ) : null}
            </div>
        </div>
    );
}
