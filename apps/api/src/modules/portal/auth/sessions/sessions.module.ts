import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "@common/prisma/prisma.module";

import { AccountSessionsHandler } from "./api/account-sessions.handler";
import { CabinetAccountSessionsController } from "./api/controllers/cabinet-account-sessions.controller";
import { CrmAccountSessionsController } from "./api/controllers/crm-account-sessions.controller";
import { CabinetSessionGuard, CrmSessionGuard } from "./api/session.guard";
import { SessionCookiesService } from "./api/session-cookies.service";
import { SessionHttpService } from "./api/session-http.service";
import { SessionTokensService } from "./application/session-tokens.service";
import { SessionsService } from "./application/sessions.service";
import { AuthSessionRepository } from "./domain/auth-session-repository.interface";
import { AuthSessionPrismaRepository } from "./infrastructure/auth-session-prisma.repository";

/**
 * Сессии входа и устройства аккаунта (TASK-733…735). Глобальный: гварды `CrmAuth`/`CabinetAuth` стоят на контроллерах
 * всех модулей, и их зависимости должны находиться везде.
 */
@Global()
@Module({
    imports: [PrismaModule, JwtModule.register({})],
    providers: [
        SessionTokensService,
        SessionsService,
        SessionCookiesService,
        SessionHttpService,
        AccountSessionsHandler,
        CrmSessionGuard,
        CabinetSessionGuard,
        { provide: AuthSessionRepository, useClass: AuthSessionPrismaRepository },
    ],
    controllers: [CrmAccountSessionsController, CabinetAccountSessionsController],
    exports: [
        SessionsService,
        SessionCookiesService,
        SessionHttpService,
        CrmSessionGuard,
        CabinetSessionGuard,
        AuthSessionRepository,
    ],
})
export class SessionsModule {}
