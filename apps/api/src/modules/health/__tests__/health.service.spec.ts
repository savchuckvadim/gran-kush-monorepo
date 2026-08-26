import { PrismaService } from "@common/prisma/prisma.service";
import { RedisService } from "@common/redis/redis.service";

import { HealthService } from "../health.service";

describe("HealthService", () => {
    const createService = (opts: { dbOk: boolean; redisOk: boolean }) => {
        const prisma = {
            $queryRaw: opts.dbOk
                ? jest.fn().mockResolvedValue([{ "?column?": 1 }])
                : jest.fn().mockRejectedValue(new Error("db down")),
        } as unknown as PrismaService;

        const redis = {
            getClient: jest.fn().mockReturnValue({
                ping: opts.redisOk
                    ? jest.fn().mockResolvedValue("PONG")
                    : jest.fn().mockRejectedValue(new Error("redis down")),
            }),
        } as unknown as RedisService;

        return new HealthService(prisma, redis);
    };

    it("ready, когда Postgres и Redis отвечают", async () => {
        const result = await createService({ dbOk: true, redisOk: true }).checkReadiness();

        expect(result).toEqual({
            ready: true,
            checks: { database: "up", redis: "up" },
        });
    });

    it("not ready при недоступном Postgres", async () => {
        const result = await createService({ dbOk: false, redisOk: true }).checkReadiness();

        expect(result.ready).toBe(false);
        expect(result.checks).toEqual({ database: "down", redis: "up" });
    });

    it("not ready при недоступном Redis", async () => {
        const result = await createService({ dbOk: true, redisOk: false }).checkReadiness();

        expect(result.ready).toBe(false);
        expect(result.checks).toEqual({ database: "up", redis: "down" });
    });
});
