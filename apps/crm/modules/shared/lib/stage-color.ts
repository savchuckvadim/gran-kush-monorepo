/** Смысл стадии воронки — одинаковый в CRM и в кабинете. */
export type StageSemanticKind = "NEW" | "IN_PROGRESS" | "SUCCESS" | "FAILURE";

/** Для стадий без своего цвета: серый — новый, синий — в работе, зелёный и красный — итог. */
const FALLBACK_COLOR: Readonly<Record<StageSemanticKind, string>> = {
    NEW: "#64748b",
    IN_PROGRESS: "#2563eb",
    SUCCESS: "#16a34a",
    FAILURE: "#dc2626",
};

export const stageColor = (stage: { semantic: StageSemanticKind; color?: string | null }): string =>
    stage.color || FALLBACK_COLOR[stage.semantic];

/** Закрытый заказ (выполнен или отменён) больше не движется по воронке. */
export const isClosedSemantic = (semantic: StageSemanticKind): boolean =>
    semantic === "SUCCESS" || semantic === "FAILURE";
