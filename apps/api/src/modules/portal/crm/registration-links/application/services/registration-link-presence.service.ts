import { Injectable } from "@nestjs/common";

import { RedisService } from "@common/redis/redis.service";

/** A viewer counts as online this long after their last heartbeat. */
export const PRESENCE_TTL_MS = 45_000;

/** The online set itself dies this long after the last heartbeat: a closed tab leaves no trace. */
const KEY_TTL_SECONDS = 15 * 60;

/**
 * Кто сейчас смотрит анкету по ссылке. Эфемерное состояние в Redis: ZSET `reglink:online:{token}`,
 * member = viewerId вкладки, score = момент, когда зритель перестанет считаться онлайн.
 * Публичная страница шлёт heartbeat раз в ~30 с и `leave` при закрытии вкладки.
 */
@Injectable()
export class RegistrationLinkPresenceService {
    constructor(private readonly redis: RedisService) {}

    private key(token: string): string {
        return `reglink:online:${token}`;
    }

    async heartbeat(token: string, viewerId: string): Promise<number> {
        const client = this.redis.getClient();
        const key = this.key(token);
        const now = Date.now();
        await client.zadd(key, String(now + PRESENCE_TTL_MS), viewerId);
        await client.expire(key, KEY_TTL_SECONDS);
        await client.zremrangebyscore(key, 0, now);
        return client.zcard(key);
    }

    async leave(token: string, viewerId: string): Promise<number> {
        const client = this.redis.getClient();
        const key = this.key(token);
        await client.zrem(key, viewerId);
        await client.zremrangebyscore(key, 0, Date.now());
        return client.zcard(key);
    }

    /** Online counts for many links in one round trip — for the links list. */
    async countOnlineMany(tokens: string[]): Promise<Map<string, number>> {
        if (tokens.length === 0) return new Map();
        const client = this.redis.getClient();
        const now = Date.now();
        const pipeline = client.pipeline();
        for (const token of tokens) {
            pipeline.zremrangebyscore(this.key(token), 0, now);
            pipeline.zcard(this.key(token));
        }
        const replies = (await pipeline.exec()) ?? [];
        const counts = new Map<string, number>();
        tokens.forEach((token, index) => {
            // every token adds two commands; the second one is zcard
            const [error, value] = replies[index * 2 + 1] ?? [null, 0];
            counts.set(token, error ? 0 : Number(value ?? 0));
        });
        return counts;
    }
}
