import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import { RedisService } from "@common/redis/redis.service";

import { ReadinessChecksDto } from "./dto/health-response.dto";

const CHECK_TIMEOUT_MS = 2000;

export interface ReadinessResult {
    ready: boolean;
    checks: ReadinessChecksDto;
}

@Injectable()
export class HealthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) {}

    async checkReadiness(): Promise<ReadinessResult> {
        const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

        return {
            ready: database === "up" && redis === "up",
            checks: { database, redis },
        };
    }

    private async checkDatabase(): Promise<"up" | "down"> {
        try {
            await this.withTimeout(this.prisma.$queryRaw`SELECT 1`);
            return "up";
        } catch {
            return "down";
        }
    }

    private async checkRedis(): Promise<"up" | "down"> {
        try {
            await this.withTimeout(this.redis.getClient().ping());
            return "up";
        } catch {
            return "down";
        }
    }

    private async withTimeout<T>(promise: Promise<T>): Promise<T> {
        let timer: NodeJS.Timeout | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(
                () => reject(new Error("Readiness check timed out")),
                CHECK_TIMEOUT_MS
            );
        });

        try {
            return await Promise.race([promise, timeout]);
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }
}
