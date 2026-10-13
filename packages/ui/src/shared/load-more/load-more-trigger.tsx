"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

export interface LoadMoreTriggerProps {
    onLoadMore: () => void;
    hasMore: boolean;
    loading: boolean;
    /** The button text, for keyboards and when scrolling does not reach it */
    label: ReactNode;
}

/**
 * Loads the next page when it scrolls into view (in its own scroll container too) and stays a
 * button for keyboards. Renders nothing when there is nothing more to load.
 */
export function LoadMoreTrigger({ onLoadMore, hasMore, loading, label }: LoadMoreTriggerProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node || !hasMore || loading) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
            },
            { rootMargin: "160px" }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loading, onLoadMore]);

    if (!hasMore) return null;

    return (
        <div ref={ref} data-slot="load-more" className="flex justify-center py-1">
            <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : label}
            </Button>
        </div>
    );
}
