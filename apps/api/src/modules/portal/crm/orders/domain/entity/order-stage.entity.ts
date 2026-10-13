import { StageSemantic } from "@prisma/client";

/**
 * Стадия воронки заказов клуба. Источник правды о том, где заказ сейчас: статус для старых
 * клиентов выводится из неё (`legacyStatusOf` в order-stage.rules).
 */
export interface OrderStage {
    id: string;
    stageCategoryId: string;
    /** Базовое название; клуб мог его переименовать */
    name: string;
    /** Переводы системного названия `{ es, ru, en }`; у переименованной стадии — null */
    nameI18n: unknown;
    color: string | null;
    semantic: StageSemantic;
    sortOrder: number;
    isTerminalSuccess: boolean;
    isTerminalFailure: boolean;
}

/** Сколько заказов и на какую сумму стоит в стадии — шапка колонки канбана. */
export interface OrderStageSummary {
    stageId: string;
    count: number;
    total: number;
}
