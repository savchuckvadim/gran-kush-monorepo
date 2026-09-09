import type { DefaultJobOptions } from "bullmq";

/**
 * Значения по умолчанию для очередей (TASK-111).
 *
 * Без явных `attempts` BullMQ выполняет задачу ровно один раз: разрыв соединения с SMTP
 * или с S3 навсегда теряет письмо, и пользователь об этом не узнаёт. Поэтому повторы
 * задаются явно, а не оставляются на умолчание библиотеки.
 *
 * `removeOnComplete` — не `true`, а окно по возрасту: пока запись о выполненной задаче
 * жива, BullMQ отвергает повторную постановку с тем же `jobId`. Именно это окно делает
 * детерминированный `jobId` дедупликацией, а не украшением. Удалять запись сразу —
 * значит открыть дубль ровно в тот момент, когда наверху сработает повтор.
 */

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

/**
 * Письма. Пять попыток с экспоненциальной паузой: провайдер может отвечать 4xx/5xx
 * минутами, а письмо о регистрации или сбросе пароля терять нельзя.
 */
export const MAIL_JOB_OPTIONS: DefaultJobOptions = {
    attempts: 5,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { age: HOUR, count: 1_000 },
    // Упавшие держим неделю: этого хватает разобраться, но очередь не растёт бесконечно.
    removeOnFail: { age: 7 * DAY },
};

/**
 * События портала. Обработчик рассылает уведомления во внешние сервисы (Telegram, почта),
 * поэтому повторы нужны, но их немного: событие не критично к минутам доставки.
 */
export const PORTAL_EVENTS_JOB_OPTIONS: DefaultJobOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 15_000 },
    removeOnComplete: { age: HOUR, count: 500 },
    removeOnFail: { age: 7 * DAY },
};

/**
 * Файлы участников. Тело задачи — документы в base64, поэтому окно хранения короче:
 * держать их в Redis дольше необходимого дорого и незачем.
 */
export const MEMBER_FILES_JOB_OPTIONS: DefaultJobOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { age: 10 * 60, count: 100 },
    removeOnFail: { age: DAY, count: 100 },
};
