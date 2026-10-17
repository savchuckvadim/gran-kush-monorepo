import { Injectable } from "@nestjs/common";

import { StagePositionRepository } from "@modules/portal/crm/records/domain/repositories/stage-position.repository";
import {
    type StageColumn,
    stagePositionBelow,
    topStagePosition,
} from "@modules/portal/crm/records/domain/stage-position";

/**
 * Куда встаёт карточка в колонке канбана. Общий для смарт-процессов и заказов: позиция живёт на
 * EntityRecord. Клиент называет только соседа сверху (`afterId`), соседа снизу сервис находит сам —
 * так порядок верен, даже если на экране загружена лишь часть колонки.
 */
@Injectable()
export class StagePositionService {
    constructor(private readonly positions: StagePositionRepository) {}

    /**
     * Позиция записи `recordId` в колонке: сразу под `afterId` или наверху (`afterId` = null).
     * Сосед ушёл из колонки (параллельный перенос) — карточка встаёт наверх.
     */
    async positionFor(
        column: StageColumn,
        recordId: string,
        afterId: string | null,
        now = new Date()
    ): Promise<number> {
        if (afterId !== null && afterId !== recordId) {
            let placed = await this.belowAnchor(column, recordId, afterId);
            if (placed === null) {
                // места под соседом не осталось: развести колонку и встать под него ещё раз
                await this.positions.renumber(column);
                placed = await this.belowAnchor(column, recordId, afterId);
            }
            if (typeof placed === "number") return placed;
        }
        return topStagePosition(await this.positions.topOf(column, recordId), now);
    }

    /** `undefined` — соседа нет в колонке; `null` — места под ним не осталось */
    private async belowAnchor(
        column: StageColumn,
        recordId: string,
        afterId: string
    ): Promise<number | null | undefined> {
        const above = await this.positions.positionOf(column, afterId);
        if (above === null) return undefined;
        return stagePositionBelow(above, await this.positions.nextBelow(column, above, recordId));
    }
}
