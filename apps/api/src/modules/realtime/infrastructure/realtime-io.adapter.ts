import type { INestApplicationContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";

import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import type { Server, ServerOptions } from "socket.io";

import { createRedisOptions } from "@common/redis/redis.config";

import { REALTIME_TRANSPORTS } from "../realtime.constants";

/**
 * socket.io для нескольких инстансов API: события и разрывы соединений расходятся через Redis
 * (pub/sub), поэтому сотрудник на одном инстансе получает событие, опубликованное другим.
 * Подключается в main.ts; e2e работают на встроенном адаптере одного процесса.
 */
export class RealtimeIoAdapter extends IoAdapter {
    private redisAdapter?: ReturnType<typeof createAdapter>;
    private clients: Redis[] = [];

    constructor(app: INestApplicationContext) {
        super(app);
    }

    /** Те же REDIS_URL / REDIS_HOST, что у очередей. */
    async connectToRedis(config: ConfigService): Promise<void> {
        const options = createRedisOptions(config);
        const publisher = options.url
            ? new Redis(options.url, { lazyConnect: true })
            : new Redis({
                  host: options.host,
                  port: options.port,
                  password: options.password || undefined,
                  lazyConnect: true,
              });
        const subscriber = publisher.duplicate();
        await Promise.all([publisher.connect(), subscriber.connect()]);
        this.clients = [publisher, subscriber];
        this.redisAdapter = createAdapter(publisher, subscriber);
    }

    createIOServer(port: number, options?: ServerOptions): Server {
        const server = super.createIOServer(port, {
            ...options,
            transports: [...REALTIME_TRANSPORTS],
        }) as Server;
        if (this.redisAdapter) server.adapter(this.redisAdapter);
        return server;
    }

    async close(server: Server): Promise<void> {
        await super.close(server);
        await Promise.all(this.clients.map((client) => client.quit().catch(() => undefined)));
    }
}
