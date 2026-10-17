import type {
    OrderStage,
    OrderStageSummary,
} from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
import type {
    OrderFilters,
    StockLine,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

/** Стадии заказа: воронки, перевод по стадиям, место карточки на канбане, сводка по колонкам. */
export abstract class OrderStageRepository {
    /**
     * Перевести заказ в стадию, только если он всё ещё стоит в `fromStageId` (compare-and-set).
     * `false` — стадию успел сменить параллельный запрос: двойная отмена не вернёт товар дважды.
     * `restock` возвращается на склад в той же транзакции и только если переход выигран.
     */
    abstract compareAndSetStage(input: {
        orderId: string;
        portalId: string;
        fromStageId: string | null;
        toStageId: string;
        /** Место карточки в новой колонке канбана (`records/domain/stage-position.ts`) */
        stagePosition?: number;
        restock?: readonly StockLine[];
    }): Promise<boolean>;

    /** Запись заказа, на которой живут стадия и место карточки; чужой заказ — null */
    abstract findCardRecord(
        orderId: string,
        portalId: string
    ): Promise<{ entityRecordId: string; entityDefinitionId: string } | null>;

    /**
     * Переставить карточку заказа внутри её колонки `stageId`. `false` — заказ уже не в этой
     * стадии (его успели перенести): запись не изменена.
     */
    abstract setStagePosition(
        entityRecordId: string,
        stageId: string,
        stagePosition: number
    ): Promise<boolean>;

    /** Стадия из воронок заказов этого портала; чужая или не заказная — null */
    abstract findStageInPortal(portalId: string, stageId: string): Promise<OrderStage | null>;

    /**
     * Стадии воронки заказов портала по порядку. Без `stageCategoryId` — воронка по умолчанию;
     * воронка чужого портала или другой сущности — пустой список.
     */
    abstract findFunnelStages(
        portalId: string,
        stageCategoryId?: string | null
    ): Promise<OrderStage[]>;

    /** Число и сумма заказов в каждой из стадий при тех же фильтрах, что у списка */
    abstract summarizeByStage(
        filters: OrderFilters,
        stageIds: readonly string[]
    ): Promise<OrderStageSummary[]>;
}
