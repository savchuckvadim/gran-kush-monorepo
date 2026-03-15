import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { createRedisOptions } from "@common/redis/redis.config";
import { RedisModule } from "@common/redis/redis.module";

/**
 * Global QueueModule - provides centralized BullMQ configuration
 * This module should be imported once in AppModule
 * All queue registrations (BullModule.registerQueue) should be done in feature modules
 */
@Global()
@Module({
    imports: [
        BullModule.forRootAsync({
            useFactory: (configService: ConfigService) => {
                const redisOptions = createRedisOptions(configService);

                // If URL is provided, parse it; otherwise use individual options
                if (redisOptions.url) {
                    const url = new URL(redisOptions.url);
                    return {
                        connection: {
                            host: url.hostname,
                            port: parseInt(url.port, 10) || 6379,
                            maxRetriesPerRequest: redisOptions.maxRetriesPerRequest,
                            connectTimeout: redisOptions.connectTimeout,
                        },
                    };
                }

                return {
                    connection: {
                        host: redisOptions.host ?? "localhost",
                        port: redisOptions.port,
                        maxRetriesPerRequest: redisOptions.maxRetriesPerRequest,
                        connectTimeout: redisOptions.connectTimeout,
                    },
                };
            },
            inject: [ConfigService],
        }),
        RedisModule,
    ],
    exports: [BullModule],
})
export class QueueModule {}
