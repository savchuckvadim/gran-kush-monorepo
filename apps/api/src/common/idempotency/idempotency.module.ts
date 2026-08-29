import { Global, Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { IdempotencyService } from "./idempotency.service";

/**
 * Глобальный: `@Idempotent()` навешивается в любом модуле, и интерцептор
 * должен резолвиться без импорта этого модуля в каждом из них.
 */
@Global()
@Module({
    imports: [PrismaModule],
    providers: [IdempotencyService, IdempotencyInterceptor],
    exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule {}
