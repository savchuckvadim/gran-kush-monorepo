import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CabinetNotificationsController } from "./api/controllers/cabinet-notifications.controller";
import { CrmNotificationsController } from "./api/controllers/crm-notifications.controller";
import { NotificationsService } from "./application/notifications.service";
import { OrderNotificationsConsumer } from "./application/order-notifications.consumer";
import { TelegramNotificationsConsumer } from "./application/telegram-notifications.consumer";
import { NotificationDirectory } from "./domain/notification-directory.interface";
import { NotificationRepository } from "./domain/notification-repository.interface";
import { NotificationPrismaDirectory } from "./infrastructure/notification-prisma.directory";
import { NotificationPrismaRepository } from "./infrastructure/notification-prisma.repository";
import { TelegramBotClient } from "./infrastructure/telegram-bot.client";

/**
 * Уведомления (TASK-781): потребители шины превращают события в личные уведомления сотрудника
 * или участника (правила — `domain/*-notification-rules.ts`), каждое уведомление — событие
 * `notification.created`: колокольчик и тост через realtime, Telegram — отдельным потребителем.
 */
@Module({
    imports: [PrismaModule],
    controllers: [CrmNotificationsController, CabinetNotificationsController],
    providers: [
        NotificationsService,
        OrderNotificationsConsumer,
        TelegramNotificationsConsumer,
        TelegramBotClient,
        { provide: NotificationRepository, useClass: NotificationPrismaRepository },
        { provide: NotificationDirectory, useClass: NotificationPrismaDirectory },
    ],
})
export class NotificationsModule {}
