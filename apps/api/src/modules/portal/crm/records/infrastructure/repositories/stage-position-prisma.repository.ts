import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { StagePositionRepository } from "@modules/portal/crm/records/domain/repositories/stage-position.repository";
import {
    STAGE_POSITION_STEP,
    type StageColumn,
} from "@modules/portal/crm/records/domain/stage-position";

const columnWhere = (column: StageColumn) => ({
    portalId: column.portalId,
    entityDefinitionId: column.entityDefinitionId,
    stageId: column.stageId,
});

@Injectable()
export class StagePositionPrismaRepository extends StagePositionRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async positionOf(column: StageColumn, recordId: string): Promise<number | null> {
        const row = await this.prisma.entityRecord.findFirst({
            where: { ...columnWhere(column), id: recordId },
            select: { stagePosition: true },
        });
        return row?.stagePosition ?? null;
    }

    async topOf(column: StageColumn, exceptId: string): Promise<number | null> {
        const { _min } = await this.prisma.entityRecord.aggregate({
            where: { ...columnWhere(column), id: { not: exceptId } },
            _min: { stagePosition: true },
        });
        return _min.stagePosition;
    }

    async nextBelow(
        column: StageColumn,
        position: number,
        exceptId: string
    ): Promise<number | null> {
        const { _min } = await this.prisma.entityRecord.aggregate({
            where: {
                ...columnWhere(column),
                id: { not: exceptId },
                stagePosition: { gt: position },
            },
            _min: { stagePosition: true },
        });
        return _min.stagePosition;
    }

    /**
     * Одним UPDATE: позиции колонки раскладываются от её верхней до нижней с равным шагом (не
     * меньше {@link STAGE_POSITION_STEP}), порядок — тот же, что видит канбан.
     */
    async renumber(column: StageColumn): Promise<void> {
        const stage =
            column.stageId === null
                ? Prisma.sql`stage_id IS NULL`
                : Prisma.sql`stage_id = ${column.stageId}`;
        await this.prisma.$executeRaw`
            WITH ordered AS (
                SELECT id,
                       row_number() OVER (ORDER BY stage_position, created_at DESC) - 1 AS idx,
                       count(*) OVER () AS total,
                       min(stage_position) OVER () AS low,
                       max(stage_position) OVER () AS high
                FROM entity_records
                WHERE portal_id = ${column.portalId}
                  AND entity_definition_id = ${column.entityDefinitionId}
                  AND ${stage}
            )
            UPDATE entity_records AS r
            SET stage_position = o.low + o.idx * GREATEST(
                (o.high - o.low) / GREATEST(o.total - 1, 1),
                ${STAGE_POSITION_STEP}::double precision
            )
            FROM ordered AS o
            WHERE r.id = o.id`;
    }
}
