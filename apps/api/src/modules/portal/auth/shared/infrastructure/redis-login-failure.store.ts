import { Injectable } from "@nestjs/common";

import { RedisService } from "@common/redis/redis.service";

import { LoginFailureStore } from "../domain/repositories/login-failure-store.interface";

const KEY_PREFIX = "auth:login-failures:";

@Injectable()
export class RedisLoginFailureStore extends LoginFailureStore {
    constructor(private readonly redis: RedisService) {
        super();
    }

    async count(key: string): Promise<number> {
        return Number(await this.redis.getClient().get(KEY_PREFIX + key)) || 0;
    }

    async increment(key: string, windowSeconds: number): Promise<number> {
        const client = this.redis.getClient();
        const count = await client.incr(KEY_PREFIX + key);
        if (count === 1) await client.expire(KEY_PREFIX + key, windowSeconds);
        return count;
    }

    async clear(key: string): Promise<void> {
        await this.redis.getClient().del(KEY_PREFIX + key);
    }
}
