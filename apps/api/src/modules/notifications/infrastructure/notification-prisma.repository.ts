import { Injectable } from "@nestjs/common";

import type { Notification as NotificationRow, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type NewDomainEvent, SYSTEM_ACTOR } from "@modules/events";

import {
    type NewNotification,
    type Notification,
    type NotificationChannel,
    type NotificationParams,
    recipientKey,
} from "../domain/notification";
import {
    type NotificationPage,
    NotificationRepository,
} from "../domain/notification-repository.interface";

/** JSON параметров пишет только этот репозиторий — читается обратно той же формой. */
const toParams = (value: Prisma.JsonValue): NotificationParams =>
    value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as NotificationParams)
        : {};

const toNotification = (row: NotificationRow): Notification => ({
    id: row.id,
    type: row.type,
    subjectKind: row.subjectKind,
    subjectId: row.subjectId,
    params: toParams(row.params),
    readAt: row.readAt,
    createdAt: row.createdAt,
});

const createdEvent = (row: NotificationRow): NewDomainEvent => ({
    name: "notification.created",
    portalId: row.portalId,
    actor: SYSTEM_ACTOR,
    aggregateId: row.id,
    payload: {
        notificationId: row.id,
        recipientKind: row.recipientKind,
        employeeId: row.employeeId,
        memberId: row.memberId,
        type: row.type,
        subjectKind: row.subjectKind,
        subjectId: row.subjectId,
        params: toParams(row.params),
    },
});

@Injectable()
export class NotificationPrismaRepository extends NotificationRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    async createMany(notifications: readonly NewNotification[]): Promise<number> {
        if (!notifications.length) return 0;
        return this.prisma.$transaction(async (tx) => {
            const rows = await tx.notification.createManyAndReturn({
                data: notifications.map((n) => ({
                    portalId: n.portalId,
                    recipientKind: n.recipient.kind,
                    employeeId: n.recipient.kind === "employee" ? n.recipient.employeeId : null,
                    memberId: n.recipient.kind === "member" ? n.recipient.memberId : null,
                    recipientKey: recipientKey(n.recipient),
                    type: n.type,
                    eventId: n.eventId,
                    subjectKind: n.subject.kind,
                    subjectId: n.subject.id,
                    params: n.params as Prisma.InputJsonObject,
                })),
                skipDuplicates: true,
            });
            if (rows.length) await this.events.publishMany(tx, rows.map(createdEvent));
            return rows.length;
        });
    }

    async page(
        portalId: string,
        recipientKey: string,
        options: { cursor: string | null; limit: number }
    ): Promise<NotificationPage> {
        const rows = await this.prisma.notification.findMany({
            where: { portalId, recipientKey },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: options.limit + 1,
            ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
        });
        const items = rows.slice(0, options.limit).map(toNotification);
        const nextCursor = rows.length > options.limit ? (items.at(-1)?.id ?? null) : null;
        return { items, nextCursor };
    }

    countUnread(portalId: string, recipientKey: string): Promise<number> {
        return this.prisma.notification.count({ where: { portalId, recipientKey, readAt: null } });
    }

    async markRead(
        portalId: string,
        recipientKey: string,
        ids: readonly string[] | null
    ): Promise<void> {
        await this.prisma.notification.updateMany({
            where: {
                portalId,
                recipientKey,
                readAt: null,
                ...(ids ? { id: { in: [...ids] } } : {}),
            },
            data: { readAt: new Date() },
        });
    }

    async findById(id: string): Promise<(Notification & { portalId: string }) | null> {
        const row = await this.prisma.notification.findUnique({ where: { id } });
        return row ? { ...toNotification(row), portalId: row.portalId } : null;
    }

    async channelEnabled(userId: string, channel: NotificationChannel): Promise<boolean> {
        const row = await this.prisma.notificationPreference.findUnique({
            where: { userId_channel: { userId, channel } },
        });
        return row?.enabled ?? true;
    }

    async setChannel(
        userId: string,
        channel: NotificationChannel,
        enabled: boolean
    ): Promise<void> {
        await this.prisma.notificationPreference.upsert({
            where: { userId_channel: { userId, channel } },
            create: { userId, channel, enabled },
            update: { enabled },
        });
    }
}
