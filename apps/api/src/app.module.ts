import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./common/prisma/prisma.module";
import { QueueModule } from "./common/queue/queue.module";
import { TelegramModule } from "./common/telegram/telegram.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { CronModule } from "./modules/cron/cron.module";
import { EmployeesModule } from "./modules/employees/employees.module";
// ─── Новые модули (QR-система, каталог, заказы, финансы, cron) ───────────────
import { EncryptionModule } from "./modules/encryption/encryption.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { MailModule } from "./modules/mail/mail.module";
import { MembersModule } from "./modules/members/members.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PresenceModule } from "./modules/presence/presence.module";
import { QrCodesModule } from "./modules/qr-codes/qr-codes.module";
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

        // ─── Инфраструктура ──────────────────────────────────────────
        EncryptionModule, // AES-256-GCM шифрование (Global)

        // ─── Аутентификация & пользователи ───────────────────────────
        AuthModule,
        EmployeesModule,
        MembersModule,

        // ─── Бизнес-модули ───────────────────────────────────────────
        CatalogModule, // Товары, категории, ед. измерения
        QrCodesModule, // QR-коды участников
        PresenceModule, // Система присутствия (вход/выход)
        OrdersModule, // Заказы и позиции заказов
        FinanceModule, // Финансовые транзакции и отчёты

        // ─── Cron-задачи ─────────────────────────────────────────────
        CronModule, // Авто-закрытие сессий, мониторинг

        // ─── Прочее ──────────────────────────────────────────────────
        StorageModule,
        TestModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
