"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { LoadMoreTrigger } from "@workspace/ui";

interface OrderKanbanColumnFooterProps {
    isLoading: boolean;
    isError: boolean;
    isEmpty: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
}

/** Under the cards: a loader, an error, "no orders" or the next page as the column scrolls. */
export function OrderKanbanColumnFooter({
    isLoading,
    isError,
    isEmpty,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
}: OrderKanbanColumnFooterProps) {
    const t = useTranslations("crm.orders.kanban");

    if (isLoading) {
        return (
            <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            </div>
        );
    }
    if (isError) {
        return <p className="px-2 py-4 text-center text-xs text-destructive">{t("loadError")}</p>;
    }
    if (isEmpty) {
        return <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("empty")}</p>;
    }
    return (
        <LoadMoreTrigger
            onLoadMore={onLoadMore}
            hasMore={hasNextPage}
            loading={isFetchingNextPage}
            label={t("loadMore")}
        />
    );
}
