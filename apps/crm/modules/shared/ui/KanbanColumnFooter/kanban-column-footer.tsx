"use client";

import { Loader2 } from "lucide-react";

import { LoadMoreTrigger } from "@workspace/ui";

interface KanbanColumnFooterProps {
    isLoading: boolean;
    isError: boolean;
    isEmpty: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    labels: {
        /** Under an empty column: "no orders", "no records" */
        empty: string;
        loadError: string;
        loadMore: string;
    };
}

/** Under the cards of a column: a loader, an error, "nothing here" or the next page as it scrolls. */
export function KanbanColumnFooter({
    isLoading,
    isError,
    isEmpty,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    labels,
}: KanbanColumnFooterProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            </div>
        );
    }
    if (isError) {
        return <p className="px-2 py-4 text-center text-xs text-destructive">{labels.loadError}</p>;
    }
    if (isEmpty) {
        return (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">{labels.empty}</p>
        );
    }
    return (
        <LoadMoreTrigger
            onLoadMore={onLoadMore}
            hasMore={hasNextPage}
            loading={isFetchingNextPage}
            label={labels.loadMore}
        />
    );
}
