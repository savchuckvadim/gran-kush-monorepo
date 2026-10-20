import type { TimelineEntry } from "@/modules/entities/timeline";

/**
 * Эхо в ленте: доход по оплате заказа повторяет событие «заказ оплачен», которое лента уже
 * показала, — его не выводим. Ручные проводки, сторно и загрузки таблицей остаются.
 */
export const isFeedEcho = (entry: TimelineEntry): boolean =>
    entry.kind === "event" &&
    entry.event?.name === "finance.entry_recorded" &&
    entry.event.data.source === "order_sale";
