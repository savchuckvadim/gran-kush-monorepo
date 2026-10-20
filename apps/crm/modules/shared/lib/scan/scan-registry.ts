import type { SchemaProductListDto, SchemaQrPreviewResultDto } from "@workspace/api-client/core";

/** Итог, который сканер показывает после того, как экран обработал код. */
export interface ScanReply {
    ok: boolean;
    message: string;
}

/**
 * Что открытый экран делает с прочитанным кодом — как правила realtime: экран регистрирует
 * обработчики, пока он на виду (`useScanHandlers`). Обработчик вернул ответ — сканер показывает
 * его и ждёт следующий код; не вернул или обработчика нет — сканер открывает свою карточку
 * участника или товара (стойка, списание, новый заказ).
 */
export interface ScanHandlers {
    member?: (preview: SchemaQrPreviewResultDto) => ScanReply | undefined;
    product?: (product: SchemaProductListDto) => ScanReply | undefined;
}

let stack: readonly ScanHandlers[] = [];

export const scanRegistry = {
    register(handlers: ScanHandlers): () => void {
        stack = [...stack, handlers];
        return () => {
            stack = stack.filter((entry) => entry !== handlers);
        };
    },

    /** Последний зарегистрированный — верхний экран: черновик в слайдере поверх страницы. */
    top(): ScanHandlers | undefined {
        return stack[stack.length - 1];
    },
};
