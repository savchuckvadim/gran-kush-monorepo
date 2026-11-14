import type { Job } from "bullmq";

/** Ключи, которых в данных задачи может не быть: только их можно стереть, не нарушив тип. */
type OptionalKeys<T> = {
    [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

/**
 * Последняя ли это неудачная попытка. В BullMQ 5 `failed` приходит на каждую попытку, а
 * `moveToFailed` увеличивает `attemptsMade` до того, как воркер шлёт событие, — поэтому после
 * последней попытки счётчик равен `opts.attempts` (без `attempts` задача выполняется один раз).
 */
export const isFinalAttempt = (job: Pick<Job, "attemptsMade" | "opts">): boolean =>
    job.attemptsMade >= (job.opts.attempts ?? 1);

/**
 * Стирает из данных задачи поля с секретами или персональными данными, когда они больше не нужны:
 * после успеха и после последней попытки. Запись о задаче при этом живёт своё окно
 * (`removeOnComplete` / `removeOnFail` — дедупликация по `jobId` и разбор сбоев), но без
 * ссылок с токенами и сканов документов в Redis.
 *
 * Ошибка `updateData` не всплывает: задачу могли уже удалить по `count`, и тогда стирать нечего.
 */
export const dropJobSecrets = async <T extends object>(
    job: Job<T>,
    keys: readonly OptionalKeys<T>[]
): Promise<void> => {
    const present = keys.filter((key) => job.data[key] !== undefined);
    if (present.length === 0) {
        return;
    }
    const data: T = { ...job.data };
    for (const key of present) {
        delete data[key];
    }
    try {
        await job.updateData(data);
    } catch {
        // Задачи уже нет в Redis — секретов там тоже нет
    }
};
