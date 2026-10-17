import type { EntityListFilter } from "@modules/portal/crm/entity-fields/domain/entity-filter";

export interface EntityRecordListFilters extends EntityListFilter {
    stageId?: string;
    /** Воронка: записи её стадий */
    stageCategoryId?: string;
    statusItemId?: string;
    isActive?: boolean;
}

/** Порядок списка: новые сверху (таблица) или место карточки в колонке (канбан). */
export const ENTITY_RECORD_LIST_SORTS = ["createdAt", "stagePosition"] as const;
export type EntityRecordListSort = (typeof ENTITY_RECORD_LIST_SORTS)[number];

export interface EntityRecordListPage {
    limit: number;
    skip: number;
    sortBy?: EntityRecordListSort;
}
