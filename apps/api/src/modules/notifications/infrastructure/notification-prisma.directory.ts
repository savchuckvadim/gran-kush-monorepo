import { Injectable } from "@nestjs/common";

import { IdentityProvider, type Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { effectivePermissions } from "@modules/portal/crm/access/domain/portal-role";

import type { NotificationLabel } from "../domain/notification";
import {
    type MemberRecipient,
    NotificationDirectory,
    type StaffRecipient,
    type TelegramAddress,
} from "../domain/notification-directory.interface";

const toI18n = (value: Prisma.JsonValue | null): Record<string, string> | null => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const entries = Object.entries(value).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
    );
    return entries.length ? Object.fromEntries(entries) : null;
};

@Injectable()
export class NotificationPrismaDirectory extends NotificationDirectory {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async staffWithPermission(portalId: string, permission: string): Promise<StaffRecipient[]> {
        const employees = await this.prisma.employee.findMany({
            where: { portalId, isActive: true, user: { isActive: true } },
            select: {
                id: true,
                userId: true,
                role: { select: { key: true, isSystem: true, permissions: true } },
            },
        });
        return employees
            .filter(
                (e) => e.role && effectivePermissions(e.role).some((code) => code === permission)
            )
            .map((e) => ({ employeeId: e.id, userId: e.userId }));
    }

    async member(portalId: string, memberId: string): Promise<MemberRecipient | null> {
        const member = await this.prisma.member.findFirst({
            where: { id: memberId, portalId, isActive: true },
            select: { id: true, userId: true },
        });
        return member ? { memberId: member.id, userId: member.userId } : null;
    }

    async userOfEmployee(portalId: string, employeeId: string): Promise<string | null> {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, portalId },
            select: { userId: true },
        });
        return employee?.userId ?? null;
    }

    async clubName(portalId: string): Promise<string | null> {
        const portal = await this.prisma.portal.findUnique({
            where: { id: portalId },
            select: { displayName: true },
        });
        return portal?.displayName ?? null;
    }

    async clubSlug(portalId: string): Promise<string | null> {
        const portal = await this.prisma.portal.findUnique({
            where: { id: portalId },
            select: { name: true },
        });
        return portal?.name ?? null;
    }

    async orderStage(portalId: string, stageId: string): Promise<NotificationLabel | null> {
        const stage = await this.prisma.stage.findFirst({
            where: { id: stageId, stageCategory: { portalId } },
            select: { name: true, nameI18n: true },
        });
        return stage ? { label: stage.name, labelI18n: toI18n(stage.nameI18n) } : null;
    }

    async telegramOf(userId: string): Promise<TelegramAddress | null> {
        const identity = await this.prisma.userIdentity.findFirst({
            where: { userId, provider: IdentityProvider.telegram },
            select: { providerUserId: true, locale: true },
        });
        return identity ? { chatId: identity.providerUserId, locale: identity.locale } : null;
    }
}
