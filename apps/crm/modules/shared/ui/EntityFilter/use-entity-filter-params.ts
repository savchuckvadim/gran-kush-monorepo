"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { EntityFilterField, EntityFilterState } from "./types";
import { decodeFilterState, encodeFilterState } from "./url-state";

/**
 * A list's filter and page live in the URL: a copied link opens the same selection, and Back
 * from a card returns to it. `fields` must be memoised by the caller.
 */
export function useEntityFilterParams(fields: EntityFilterField[]) {
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const state = useMemo(() => decodeFilterState(searchParams, fields), [searchParams, fields]);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "", 10) || 1);
    // field params arrive before the field list does: the page waits instead of loading everyone
    const hasFieldParams = useMemo(
        () => [...searchParams.keys()].some((key) => key.startsWith("f.")),
        [searchParams]
    );

    // history.replaceState is synced into useSearchParams by Next without a server round trip,
    // so a click right after typing never builds on a stale filter
    const navigate = useCallback(
        (next: EntityFilterState, nextPage: number) => {
            const search = encodeFilterState(next, nextPage, new URLSearchParams(searchParams));
            const query = search.toString();
            window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
        },
        [pathname, searchParams]
    );

    const setState = useCallback((next: EntityFilterState) => navigate(next, 1), [navigate]);
    const setPage = useCallback((nextPage: number) => navigate(state, nextPage), [navigate, state]);

    return { state, setState, page, setPage, hasFieldParams };
}
