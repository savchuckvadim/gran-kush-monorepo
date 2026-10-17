import type { StageColumn } from "@modules/portal/crm/records/domain/stage-position";

/** Позиции карточек в колонке канбана (`stage-position.ts`). */
export abstract class StagePositionRepository {
    /** Позиция записи, если она стоит в этой колонке */
    abstract positionOf(column: StageColumn, recordId: string): Promise<number | null>;

    /** Позиция верхней карточки колонки, не считая `exceptId` */
    abstract topOf(column: StageColumn, exceptId: string): Promise<number | null>;

    /** Позиция ближайшей карточки ниже `position`, не считая `exceptId` */
    abstract nextBelow(
        column: StageColumn,
        position: number,
        exceptId: string
    ): Promise<number | null>;

    /** Развести позиции колонки равномерно (не меньше шага), сохранив порядок */
    abstract renumber(column: StageColumn): Promise<void>;
}
