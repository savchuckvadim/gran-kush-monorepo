import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./common/prisma/prisma.module";
import { QueueModule } from "./common/queue/queue.module";
import { TelegramModule } from "./common/telegram/telegram.module";
import { AuthModule } from "./modules/auth/auth.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { MailModule } from "./modules/mail/mail.module";
import { MembersModule } from "./modules/members/members.module";
import { StorageModule } from "./modules/storage/storage.module";
import { TestModule } from "./modules/test/test.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [".env"],
            expandVariables: true,
        }),
        PrismaModule,
        QueueModule, // Centralized queue configuration - imported once here
        TelegramModule, // Global telegram module
        MailModule, // Global mail module with queue processor
        AuthModule,
        EmployeesModule,
        MembersModule,
        StorageModule,
        TestModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
