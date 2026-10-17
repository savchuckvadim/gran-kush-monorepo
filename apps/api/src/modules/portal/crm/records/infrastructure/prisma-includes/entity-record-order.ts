import { Prisma } from "@prisma/client";

import type { EntityRecordListSort } from "@modules/portal/crm/records/domain/entity-record-list";

/** Сортировки списка записей; равные позиции в колонке — новые выше, как в канбане. */
export const ENTITY_RECORD_LIST_ORDER: Record<
    EntityRecordListSort,
    Prisma.EntityRecordOrderByWithRelationInput[]
> = {
    createdAt: [{ createdAt: "desc" }],
    stagePosition: [{ stagePosition: "asc" }, { createdAt: "desc" }],
};
