import { Prisma } from "@prisma/client";

/** Сырой вебхук провайдера — до какой-либо интерпретации тела. */
export interface PaymentWebhookRequest {
    provider: string;
    /** Тело запроса ровно как пришло: подпись считается по байтам, а не по разобранному JSON. */
    rawBody: string;
    headers: Record<string, string | string[] | undefined>;
}

/** Событие провайдера после проверки подписи и разбора тела. */
export interface PaymentEventInput {
    /** Идентификатор события у провайдера — якорь идемпотентности. */
    eventId: string;
    type: string;
    payload: Prisma.InputJsonValue;
}

/**
 * Адаптер конкретного провайдера. Проверка подписи и разбор тела намеренно
 * объединены: разбирать неподтверждённое тело нельзя, а раздельные методы
 * позволяют вызвать разбор в обход проверки.
 */
export interface PaymentWebhookVerifier {
    readonly provider: string;
    /** Невалидная подпись — исключение, а не `null`: тихий отказ легко пропустить. */
    parseVerified(request: PaymentWebhookRequest): PaymentEventInput;
}

export const PAYMENT_WEBHOOK_VERIFIERS = Symbol("PAYMENT_WEBHOOK_VERIFIERS");

/**
 * `processed` — событие обработано этим вызовом.
 * `duplicate` — повторная доставка уже обработанного события; провайдеру отвечаем 200 без действий.
 */
export type PaymentEventOutcome = "processed" | "duplicate";

export interface PaymentEventResult {
    outcome: PaymentEventOutcome;
    provider: string;
    eventId: string;
}
