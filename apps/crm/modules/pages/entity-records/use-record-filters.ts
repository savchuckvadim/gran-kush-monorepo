"use client";

import { useMemo } from "react";

import type { RecordsFilter } from "@/modules/entities/entity-records";
import { toFilterFields, useEntityFilterFields } from "@/modules/entities/entity-settings";
import { toFieldConditions, useEntityFilterParams } from "@/modules/shared";

/**
 * Search and field conditions of a smart process, kept in the address like the members' filter,
 * so a link opens the same selection and Back from a record returns to it. Both views and the
 * page of the table read the same state.
 */
export function useRecordFilters(code: string) {
    const { data: schemaFields } = useEntityFilterFields(code);
    const fields = useMemo(() => toFilterFields(schemaFields ?? []), [schemaFields]);
    const { state, setState, page, setPage, hasFieldParams } = useEntityFilterParams(fields);

    const filter = useMemo<RecordsFilter>(() => {
        const conditions = toFieldConditions(state, fields);
        return {
            q: state.q.trim() || undefined,
            filter: conditions.length > 0 ? JSON.stringify(conditions) : undefined,
        };
    }, [state, fields]);

    // a link with field conditions waits for the fields instead of loading everyone first
    const isReady = schemaFields !== undefined || !hasFieldParams;

    return { fields, state, setState, page, setPage, filter, isReady };
}

export type RecordFilters = ReturnType<typeof useRecordFilters>;
