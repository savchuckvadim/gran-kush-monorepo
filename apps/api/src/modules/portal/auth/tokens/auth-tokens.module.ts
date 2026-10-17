import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { AuthTokensService } from "./application/auth-tokens.service";
import { AuthTokenRepository } from "./domain/auth-token-repository.interface";
import { AuthTokenPrismaRepository } from "./infrastructure/auth-token-prisma.repository";

/** Одноразовые ссылки из писем (TASK-736). */
@Module({
    imports: [PrismaModule],
    providers: [
        AuthTokensService,
        { provide: AuthTokenRepository, useClass: AuthTokenPrismaRepository },
    ],
    exports: [AuthTokensService, AuthTokenRepository],
})
export class AuthTokensModule {}
