import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";

import { StagePositionService } from "./stage-position.service";

interface EntityScope {
    portalId: string;
    entityDefinitionId: string;
}

/**
 * Стадия и место карточки записи смарт-процесса. Стадия — только из воронок этой сущности
 * (перенос между её воронками разрешён); новая запись — в выбранную стадию или в первую стадию
 * воронки по умолчанию и встаёт наверх колонки.
 */
@Injectable()
export class RecordStageService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly positions: StagePositionService
    ) {}

    /** Стадия новой записи: запрошенная (проверенная) или первая стадия воронки по умолчанию. */
    async stageForNewRecord(scope: EntityScope, requested?: string): Promise<string | null> {
        if (requested) {
            await this.assertStageOfEntity(scope, requested);
            return requested;
        }
        const stage = await this.prisma.stage.findFirst({
            where: { stageCategory: { ...scope, isDefault: true } },
            orderBy: { sortOrder: "asc" },
            select: { id: true },
        });
        return stage?.id ?? null;
    }

    /**
     * Перенос карточки: в стадию `stageId` (null — без стадии) под соседа `afterId` (null —
     * наверх). `afterId` не передан: смена стадии ставит наверх, та же стадия — ничего не меняет.
     */
    async move(
        scope: EntityScope,
        record: { id: string; stageId: string | null },
        stageId: string | null,
        afterId: string | null | undefined
    ): Promise<void> {
        if (afterId === undefined && record.stageId === stageId) return;
        if (stageId) await this.assertStageOfEntity(scope, stageId);

        const stagePosition = await this.positions.positionFor(
            { ...scope, stageId },
            record.id,
            afterId ?? null
        );
        await this.prisma.entityRecord.update({
            where: { id: record.id },
            data: { stageId, stagePosition },
        });
    }

    private async assertStageOfEntity(scope: EntityScope, stageId: string): Promise<void> {
        const stage = await this.prisma.stage.findFirst({
            where: { id: stageId, stageCategory: scope },
            select: { id: true },
        });
        if (!stage) {
            throw new BadRequestException("Stage does not belong to this entity");
        }
    }
}
