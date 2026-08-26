import { ConflictException, NotFoundException } from "@nestjs/common";

import { MemberJoinSource, RegistrationLinkKind } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import { RegistrationLinksService } from "../application/services/registration-links.service";

const LINK_ID = "link-1";
const PORTAL_ID = "portal-1";

const link = (over: Record<string, unknown> = {}) => ({
    id: LINK_ID,
    portalId: PORTAL_ID,
    token: "tok",
    isActive: true,
    expiresAt: null,
    maxUses: 1,
    usesCount: 0,
    kind: RegistrationLinkKind.public_link,
    portal: { id: PORTAL_ID, name: "club", displayName: "Club" },
    ...over,
});

describe("RegistrationLinksService — лимит использований", () => {
    const build = (opts: { consumed?: number; joinFails?: Error } = {}) => {
        const prisma = {
            registrationLink: { findUnique: jest.fn().mockResolvedValue(link()) },
            member: { findUnique: jest.fn().mockResolvedValue(null) },
            $executeRaw: jest.fn().mockResolvedValue(opts.consumed ?? 1),
        };
        const accountProvisioning = {
            ensureUserWithPassword: jest
                .fn()
                .mockResolvedValue({ user: { id: "u-1" }, created: true, claimed: false }),
        };
        const joinPortalService = {
            joinPortal: opts.joinFails
                ? jest.fn().mockRejectedValue(opts.joinFails)
                : jest.fn().mockResolvedValue({ id: "member-1" }),
        };
        const formSchemaService = { getFormSchema: jest.fn() };

        const service = new RegistrationLinksService(
            prisma as unknown as PrismaService,
            accountProvisioning as never,
            joinPortalService as never,
            formSchemaService as never
        );

        return { service, prisma, joinPortalService };
    };

    const dto = { email: "a@b.c", password: "secret", fields: {} };

    it("занимает слот до регистрации, а не после", async () => {
        const { service, prisma, joinPortalService } = build();

        await service.registerViaLink("tok", dto as never);

        const consumeOrder = prisma.$executeRaw.mock.invocationCallOrder[0];
        const joinOrder = joinPortalService.joinPortal.mock.invocationCallOrder[0];
        expect(consumeOrder).toBeLessThan(joinOrder);
    });

    it("исчерпанный лимит: UPDATE не задел строк — регистрация не начинается", async () => {
        const { service, joinPortalService } = build({ consumed: 0 });

        await expect(service.registerViaLink("tok", dto as never)).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(joinPortalService.joinPortal).not.toHaveBeenCalled();
    });

    it("возвращает слот, если регистрация упала", async () => {
        const { service, prisma } = build({ joinFails: new ConflictException("boom") });

        await expect(service.registerViaLink("tok", dto as never)).rejects.toBeInstanceOf(
            ConflictException
        );

        // первый вызов — занять слот, второй — вернуть
        expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it("успешная регистрация слот не возвращает", async () => {
        const { service, prisma } = build();

        const result = await service.registerViaLink("tok", dto as never);

        expect(result.memberId).toBe("member-1");
        expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("kiosk-ссылка размечает источник вступления", async () => {
        const { service, prisma, joinPortalService } = build();
        prisma.registrationLink.findUnique.mockResolvedValue(
            link({ kind: RegistrationLinkKind.kiosk })
        );

        await service.registerViaLink("tok", dto as never);

        expect(joinPortalService.joinPortal).toHaveBeenCalledWith(
            expect.objectContaining({ joinSource: MemberJoinSource.kiosk })
        );
    });
});
