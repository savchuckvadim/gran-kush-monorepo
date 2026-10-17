/**
 * Порядок карточек в колонке канбана (стадии). Позиция — число, меньше — выше.
 *
 * Шкала — минус время в миллисекундах: новая запись получает `-now` умолчанием БД и встаёт наверх
 * без отдельного запроса, а перенос наверх берёт меньшее из «выше верхней» и `-now` — последнее
 * действие оказывается сверху. Карточка между соседями получает середину; когда double исчерпал
 * точность между ними, колонку перенумеровывают с тем же порядком и в той же шкале.
 */

/** Шаг над верхней и под нижней карточкой — 1 мс шкалы */
export const STAGE_POSITION_STEP = 1;

/** Колонка канбана: записи одной сущности клуба в одной стадии (`null` — без стадии) */
export interface StageColumn {
    portalId: string;
    entityDefinitionId: string;
    stageId: string | null;
}

/** Позиция наверху колонки: выше верхней карточки и не ниже «сейчас». */
export const topStagePosition = (topOfColumn: number | null, now: Date): number =>
    Math.min(-now.getTime(), topOfColumn === null ? Infinity : topOfColumn - STAGE_POSITION_STEP);

/**
 * Позиция сразу под карточкой `above`: середина до следующей или шаг вниз, если ниже никого.
 * `null` — места между ними не осталось, колонку нужно перенумеровать.
 */
export const stagePositionBelow = (above: number, below: number | null): number | null => {
    if (below === null) return above + STAGE_POSITION_STEP;
    const middle = above + (below - above) / 2;
    return middle > above && middle < below ? middle : null;
};
