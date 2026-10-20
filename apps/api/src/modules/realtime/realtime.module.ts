import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { SessionsModule } from "@modules/portal/auth/sessions/sessions.module";

import { CabinetRealtimeGateway } from "./api/cabinet-realtime.gateway";
import { CrmRealtimeGateway } from "./api/crm-realtime.gateway";
import { RealtimeConsumer } from "./application/realtime.consumer";
import { RealtimeAuthService } from "./application/realtime-auth.service";
import { RealtimeHubService } from "./application/realtime-hub.service";

/**
 * Realtime (TASK-794, documentation/backend/REALTIME.md): socket.io-шлюзы CRM и кабинета —
 * потребитель шины доменных событий. Рукопожатие — по сессии и членству в клубе, комнаты —
 * по клубу и правам, отправка — по аудитории события из каталога.
 */
@Module({
    imports: [PrismaModule, SessionsModule],
    providers: [
        RealtimeAuthService,
        RealtimeHubService,
        RealtimeConsumer,
        CrmRealtimeGateway,
        CabinetRealtimeGateway,
    ],
})
export class RealtimeModule {}
