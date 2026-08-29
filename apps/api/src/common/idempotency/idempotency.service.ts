import { Injectable } from "@nestjs/common";

import { IdempotencyStatus, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

import { PrismaService } from "@common/prisma/prisma.service";

import { IDEMPOTENCY_TTL_HOURS } from "./idempotency.constants";

/** Адрес ключа: операция + владелец + значение заголовка. */
export interface IdempotencyIdentity {
    scope: string;
    ownerKey: string;
    key: string;
}

export type IdempotencyOutcome =
    /** Ключ занят нами — запрос надо выполнить. */
    | { kind: "acquired" }
    /** Ключ уже отработан — отдаём сохранённый ответ. */
    | { kind: "replay"; statusCode: number; response: Prisma.JsonValue }
    /** Ключ занят параллельным запросом, который ещё не закончил. */
    | { kind: "in_progress" }
    /** Тот же ключ прислан с другим телом — ошибка клиента, а не повтор. */
    | { kind: "mismatch" };

/**
 * Стабильная сериализация: порядок ключей объекта не должен превращать
 * тот же запрос в «другое тело».
 */
const canonicalize = (value: unknown): string => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value) ?? "null";
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalize).join(",")}]`;
    }
    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
};

/** Ответ в том виде, в каком он уйдёт по сети — его и воспроизводим при повторе. */
const toStoredResponse = (value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull => {
    if (value === undefined || value === null) {
        return Prisma.DbNull;
    }
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

@Injectable()
export class IdempotencyService {
    constructor(private readonly prisma: PrismaService) {}

    hashRequest(body: unknown): string {
        return createHash("sha256").update(canonicalize(body)).digest("hex");
    }

    /**
     * Занимает ключ до выполнения запроса.
     *
     * Вставка идёт через `createMany({ skipDuplicates })` (`ON CONFLICT DO NOTHING`), а не
     * через `create` с перехватом `P2002` — тот же приём, что в TASK-101: `count` даёт сигнал
     * «уже было» без исключения, а исключение внутри транзакции перевело бы её в aborted.
     */
    async acquire(
        identity: IdempotencyIdentity,
        requestHash: string,
        now: Date = new Date()
    ): Promise<IdempotencyOutcome> {
        const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);

        // Две попытки: строку, из-за которой не прошла вставка, мог снять release()
        // параллельного упавшего запроса — тогда ключ снова свободен.
        for (let attempt = 0; attempt < 2; attempt += 1) {
            // Протухшая строка не должна держать ключ занятым навсегда.
            await this.prisma.idempotencyKey.deleteMany({
                where: { ...identity, expiresAt: { lt: now } },
            });

            const { count } = await this.prisma.idempotencyKey.createMany({
                data: [{ ...identity, requestHash, expiresAt }],
                skipDuplicates: true,
            });
            if (count === 1) {
                return { kind: "acquired" };
            }

            const existing = await this.prisma.idempotencyKey.findUnique({
                where: { scope_ownerKey_key: identity },
            });
            if (!existing) {
                continue;
            }

            if (existing.requestHash !== requestHash) {
                return { kind: "mismatch" };
            }
            if (existing.status !== IdempotencyStatus.completed) {
                return { kind: "in_progress" };
            }
            return {
                kind: "replay",
                statusCode: existing.statusCode ?? 200,
                response: existing.response ?? null,
            };
        }

        // Ключ дважды исчез между конфликтом вставки и чтением. Крутиться дальше
        // бессмысленно: выполняем запрос без защиты — ровно как если бы клиент
        // не прислал заголовок вовсе.
        return { kind: "acquired" };
    }

    /** Успешный ответ сохраняется под ключом; отсюда его берёт повтор. */
    async complete(
        identity: IdempotencyIdentity,
        statusCode: number,
        response: unknown,
        now: Date = new Date()
    ): Promise<void> {
        await this.prisma.idempotencyKey.updateMany({
            where: { ...identity, status: IdempotencyStatus.in_progress },
            data: {
                status: IdempotencyStatus.completed,
                statusCode,
                response: toStoredResponse(response),
                completedAt: now,
            },
        });
    }

    /**
     * Снимает ключ после неудачи. Ошибки не сохраняются намеренно: иначе первый же
     * сетевой сбой навсегда занял бы ключ, и осмысленный ретрай клиента получал бы
     * в ответ ту же ошибку вместо выполнения.
     */
    async release(identity: IdempotencyIdentity): Promise<void> {
        await this.prisma.idempotencyKey.deleteMany({
            where: { ...identity, status: IdempotencyStatus.in_progress },
        });
    }

    /** Уборка протухших строк. Идемпотентна — повторный прогон крона безопасен. */
    async purgeExpired(now: Date = new Date()): Promise<number> {
        const { count } = await this.prisma.idempotencyKey.deleteMany({
            where: { expiresAt: { lt: now } },
        });
        return count;
    }
}
