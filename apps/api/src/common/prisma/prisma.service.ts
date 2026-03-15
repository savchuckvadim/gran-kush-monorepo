import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(configService: ConfigService) {
        // Get DATABASE_URL from ConfigService (centralized config management)
        const databaseUrl = configService.get<string>("DATABASE_URL");

        if (!databaseUrl) {
            throw new Error(
                "DATABASE_URL is not defined. Please check your .env file in apps/api/.env"
            );
        }

        // In Prisma 7+, you must construct the client with an adapter
        // For PostgreSQL, we use PrismaPg adapter
        const adapter = new PrismaPg({
            connectionString: databaseUrl,
        });

        super({ adapter });
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }
}
