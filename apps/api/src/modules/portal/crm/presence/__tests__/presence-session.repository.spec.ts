import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { PresenceSessionPrismaRepository } from "@modules/portal/crm/presence/infrastructure/repositories/presence-session-prisma.repository";

const ENTITY_RECORD_ID = "er-1";
const MEMBER_ID = "m-1";
const PORTAL_ID = "p-1";

const sessionRow = (over: Record<string, unknown> = {}) => ({
    id: "s-1",
    entityRecordId: ENTITY_RECORD_ID,
    activeEntityRecordId: ENTITY_RECORD_ID,
    employeeId: null,
    enteredAt: new Date("2026-08-26T10:00:00Z"),
    exitedAt: null,
    entryMethod: "qr",
    exitMethod: null,
    createdAt: new Date("2026-08-26T10:00:00Z"),
    updatedAt: new Date("2026-08-26T10:00:00Z"),
    entityRecord: { id: ENTITY_RECORD_ID, member: null, fieldValues: [] },
    employee: null,
    ...over,
});

const uniqueViolation = () =>
    new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.4.0",
        meta: { target: ["active_entity_record_id"] },
    });

describe("PresenceSessionPrismaRepository — одна открытая сессия", () => {
    const build = () => {
        const prisma = {
            member: {
                findFirst: jest.fn().mockResolvedValue({ entityRecordId: ENTITY_RECORD_ID }),
            },
            presenceSession: {
                create: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
            },
        };
        return {
            prisma,
            repo: new PresenceSessionPrismaRepository(prisma as unknown as PrismaService),
        };
    };

    it("на входе проставляет маркер открытой сессии", async () => {
        const { prisma, repo } = build();
        prisma.presenceSession.create.mockResolvedValue(sessionRow());

        await repo.createEntry({
            memberId: MEMBER_ID,
            entryMethod: "qr",
            portalId: PORTAL_ID,
        });

        expect(prisma.presenceSession.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    entityRecordId: ENTITY_RECORD_ID,
                    activeEntityRecordId: ENTITY_RECORD_ID,
                }),
            })
        );
    });

    it("при гонке возвращает уже открытую сессию вместо второй записи", async () => {
        const { prisma, repo } = build();
        prisma.presenceSession.create.mockRejectedValue(uniqueViolation());
        prisma.presenceSession.findFirst.mockResolvedValue(sessionRow({ id: "s-existing" }));

        const session = await repo.createEntry({
            memberId: MEMBER_ID,
            entryMethod: "qr",
            portalId: PORTAL_ID,
        });

        expect(session.id).toBe("s-existing");
        expect(prisma.presenceSession.create).toHaveBeenCalledTimes(1);
        expect(prisma.presenceSession.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { activeEntityRecordId: ENTITY_RECORD_ID } })
        );
    });

    it("пробрасывает конфликт, если открытую сессию успели закрыть", async () => {
        const { prisma, repo } = build();
        prisma.presenceSession.create.mockRejectedValue(uniqueViolation());
        prisma.presenceSession.findFirst.mockResolvedValue(null);

        await expect(
            repo.createEntry({ memberId: MEMBER_ID, entryMethod: "qr", portalId: PORTAL_ID })
        ).rejects.toMatchObject({ code: "P2002" });
    });

    it("не глотает нарушение уникальности по другому полю", async () => {
        const { prisma, repo } = build();
        const otherConflict = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "7.4.0",
            meta: { target: ["some_other_column"] },
        });
        prisma.presenceSession.create.mockRejectedValue(otherConflict);

        await expect(
            repo.createEntry({ memberId: MEMBER_ID, entryMethod: "qr", portalId: PORTAL_ID })
        ).rejects.toBe(otherConflict);
        expect(prisma.presenceSession.findFirst).not.toHaveBeenCalled();
    });

    it("закрытие сессии снимает маркер", async () => {
        const { prisma, repo } = build();
        prisma.presenceSession.update.mockResolvedValue(
            sessionRow({ exitedAt: new Date(), exitMethod: "qr", activeEntityRecordId: null })
        );

        await repo.closeSession("s-1", { exitMethod: "qr" });

        expect(prisma.presenceSession.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ activeEntityRecordId: null }),
            })
        );
    });

    it("массовое закрытие снимает маркер и не трогает уже закрытые", async () => {
        const { prisma, repo } = build();
        prisma.presenceSession.updateMany.mockResolvedValue({ count: 2 });

        const count = await repo.closeMany(["s-1", "s-2"], "auto_cron");

        expect(count).toBe(2);
        expect(prisma.presenceSession.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ["s-1", "s-2"] }, exitedAt: null },
                data: expect.objectContaining({ activeEntityRecordId: null }),
            })
        );
    });
});
