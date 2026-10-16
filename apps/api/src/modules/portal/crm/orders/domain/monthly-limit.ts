/*
 * Лимит отпуска участнику (TASK-720, решение 3). Решения по умолчанию, 2026-10-16:
 * - окно — последние 30 дней до заказа: у клуба нет своего часового пояса, а календарный месяц
 *   без него сдвигает границу на часы;
 * - считаются все выданные позиции, подарок тоже — это отпуск товара; отменённые заказы — нет;
 * - товар входит в лимит, только если клуб задал ему «граммы на единицу».
 */

export const LIMIT_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Граммы считаем с точностью колонки DECIMAL(10, 3). */
export const roundGrams = (grams: number): number => Math.round(grams * 1000) / 1000;

/** Начало окна лимита для заказа в момент `now`. */
export const limitWindowStart = (now: Date): Date =>
    new Date(now.getTime() - LIMIT_WINDOW_DAYS * DAY_MS);

/** Граммы лимита одной позиции; товар без нормы в лимит не входит. */
export const itemLimitGrams = (quantity: number, gramsPerUnit: number | null): number =>
    gramsPerUnit === null ? 0 : roundGrams(quantity * gramsPerUnit);

/** Сколько ещё можно отпустить; `null` — без лимита. */
export const remainingGrams = (limitGrams: number | null, usedGrams: number): number | null =>
    limitGrams === null ? null : Math.max(0, roundGrams(limitGrams - usedGrams));
