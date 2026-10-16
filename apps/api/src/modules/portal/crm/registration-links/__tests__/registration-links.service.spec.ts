import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

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
    const build = (opts: { consumed?: number; joinFails?: Error; claimByEmail?: boolean } = {}) => {
        const prisma = {
            registrationLink: { findUnique: jest.fn().mockResolvedValue(link()) },
            member: { findUnique: jest.fn().mockResolvedValue(null) },
            $executeRaw: jest.fn().mockResolvedValue(opts.consumed ?? 1),
        };
        const accountProvisioning = {
            ensureUserWithPassword: jest.fn().mockResolvedValue({
                user: { id: "u-1", email: "a@b.c" },
                created: !opts.claimByEmail,
                claimed: false,
                claimByEmail: opts.claimByEmail ?? false,
            }),
        };
        const emailVerification = {
            sendAccountSetup: jest.fn().mockResolvedValue(undefined),
            sendVerificationEmailToUserId: jest.fn().mockResolvedValue(undefined),
        };
        const joinPortalService = {
            joinPortal: opts.joinFails
                ? jest.fn().mockRejectedValue(opts.joinFails)
                : jest.fn().mockResolvedValue({ id: "member-1" }),
        };
        const formSchemaService = { getFormSchema: jest.fn() };
        const presence = { countOnlineMany: jest.fn().mockResolvedValue(new Map()) };

        const service = new RegistrationLinksService(
            prisma as unknown as PrismaService,
            accountProvisioning as never,
            joinPortalService as never,
            formSchemaService as never,
            presence as never,
            emailVerification as never
        );

        return { service, prisma, joinPortalService, emailVerification };
    };

    const dto = { email: "a@b.c", password: "secret", fields: {} };

    it("занимает слот до регистрации, а не после", async () => {
        const { service, prisma, joinPortalService } = build();

        await service.registerViaLink("tok", dto as never, "es");

        const consumeOrder = prisma.$executeRaw.mock.invocationCallOrder[0];
        const joinOrder = joinPortalService.joinPortal.mock.invocationCallOrder[0];
        expect(consumeOrder).toBeLessThan(joinOrder);
    });

    it("исчерпанный лимит: UPDATE не задел строк — регистрация не начинается", async () => {
        const { service, joinPortalService } = build({ consumed: 0 });

        await expect(service.registerViaLink("tok", dto as never, "es")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(joinPortalService.joinPortal).not.toHaveBeenCalled();
    });

    it("возвращает слот, если регистрация упала", async () => {
        const { service, prisma } = build({ joinFails: new ConflictException("boom") });

        await expect(service.registerViaLink("tok", dto as never, "es")).rejects.toBeInstanceOf(
            ConflictException
        );

        // первый вызов — занять слот, второй — вернуть
        expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it("успешная регистрация слот не возвращает", async () => {
        const { service, prisma } = build();

        const result = await service.registerViaLink("tok", dto as never, "es");

        expect(result.memberId).toBe("member-1");
        expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("kiosk-ссылка размечает источник вступления", async () => {
        const { service, prisma, joinPortalService } = build();
        prisma.registrationLink.findUnique.mockResolvedValue(
            link({ kind: RegistrationLinkKind.kiosk })
        );

        await service.registerViaLink("tok", dto as never, "es");

        expect(joinPortalService.joinPortal).toHaveBeenCalledWith(
            expect.objectContaining({ joinSource: MemberJoinSource.kiosk })
        );
    });

    it("новый аккаунт: выбор документов передаётся как есть, письмо подтверждения", async () => {
        const { service, joinPortalService, emailVerification } = build();

        await service.registerViaLink("tok", dto as never, "es");

        expect(joinPortalService.joinPortal).toHaveBeenCalledWith(
            expect.objectContaining({
                share: { documentIds: undefined, signature: undefined },
                consent: undefined,
            })
        );
        expect(emailVerification.sendVerificationEmailToUserId).toHaveBeenCalledWith("u-1", {
            app: "member",
            language: "es",
        });
        expect(emailVerification.sendAccountSetup).not.toHaveBeenCalled();
    });

    it("аккаунт без пароля чужого клуба: документы не открываются, пароль — по письму", async () => {
        const { service, joinPortalService, emailVerification } = build({ claimByEmail: true });

        const result = await service.registerViaLink("tok", dto as never, "es");

        // Членство ждёт клейма аккаунта: consent=pending до установки пароля по письму
        expect(joinPortalService.joinPortal).toHaveBeenCalledWith(
            expect.objectContaining({
                share: undefined,
                consent: expect.objectContaining({
                    token: expect.stringMatching(/^[0-9a-f]{64}$/) as string,
                    requestedAt: expect.any(Date) as Date,
                }),
            })
        );
        expect(emailVerification.sendAccountSetup).toHaveBeenCalledWith("a@b.c", {
            app: "member",
            language: "es",
            portalName: "Club",
        });
        expect(result.accountCreated).toBe(true);
    });
});

describe("RegistrationLinksService.joinViaLinkAsUser — вступление под своей сессией", () => {
    const build = (
        opts: {
            link?: Record<string, unknown>;
            email?: string;
            alreadyMember?: boolean;
            consumed?: number;
            joinFails?: Error;
        } = {}
    ) => {
        const prisma = {
            registrationLink: { findUnique: jest.fn().mockResolvedValue(link(opts.link)) },
            user: { findUnique: jest.fn().mockResolvedValue({ email: opts.email ?? "a@b.c" }) },
            member: {
                findUnique: jest.fn().mockResolvedValue(opts.alreadyMember ? { id: "m-0" } : null),
            },
            $executeRaw: jest.fn().mockResolvedValue(opts.consumed ?? 1),
        };
        const joinPortalService = {
            joinPortal: opts.joinFails
                ? jest.fn().mockRejectedValue(opts.joinFails)
                : jest.fn().mockResolvedValue({ id: "member-1" }),
        };
        const service = new RegistrationLinksService(
            prisma as unknown as PrismaService,
            {} as never,
            joinPortalService as never,
            {} as never,
            {} as never,
            {} as never
        );
        return { service, prisma, joinPortalService };
    };

    it("вступает без пароля и без письма, выбор документов передаётся как есть", async () => {
        const { service, joinPortalService } = build();

        const result = await service.joinViaLinkAsUser("tok", "u-1", {
            fields: { first_name: "A" },
            shareDocumentIds: ["d-1"],
            shareSignature: true,
        });

        expect(result).toEqual({ memberId: "member-1", portalSlug: "club" });
        expect(joinPortalService.joinPortal).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "u-1",
                portalId: PORTAL_ID,
                joinSource: MemberJoinSource.registration_link,
                registrationLinkId: LINK_ID,
                share: { documentIds: ["d-1"], signature: true },
            })
        );
        expect(joinPortalService.joinPortal.mock.calls[0][0]).not.toHaveProperty("consent");
    });

    it("kiosk-ссылка размечает источник вступления", async () => {
        const { service, joinPortalService } = build({
            link: { kind: RegistrationLinkKind.kiosk },
        });

        await service.joinViaLinkAsUser("tok", "u-1", {});

        expect(joinPortalService.joinPortal).toHaveBeenCalledWith(
            expect.objectContaining({ joinSource: MemberJoinSource.kiosk })
        );
    });

    it("уже участник: отказ до траты слота", async () => {
        const { service, prisma, joinPortalService } = build({ alreadyMember: true });

        await expect(service.joinViaLinkAsUser("tok", "u-1", {})).rejects.toBeInstanceOf(
            ConflictException
        );
        expect(prisma.$executeRaw).not.toHaveBeenCalled();
        expect(joinPortalService.joinPortal).not.toHaveBeenCalled();
    });

    it("личная ссылка на другой адрес: 403, слот не тратится", async () => {
        const { service, prisma } = build({
            link: {
                kind: RegistrationLinkKind.personal,
                prefillJson: { email: "Other@Example.com" },
            },
        });

        await expect(service.joinViaLinkAsUser("tok", "u-1", {})).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it("личная ссылка на адрес аккаунта (без учёта регистра) пускает", async () => {
        const { service, joinPortalService } = build({
            email: "Nandu@Example.com",
            link: {
                kind: RegistrationLinkKind.personal,
                prefillJson: { email: "nandu@example.com" },
            },
        });

        await service.joinViaLinkAsUser("tok", "u-1", {});

        expect(joinPortalService.joinPortal).toHaveBeenCalledTimes(1);
    });

    it("исчерпанный лимит: вступление не начинается", async () => {
        const { service, joinPortalService } = build({ consumed: 0 });

        await expect(service.joinViaLinkAsUser("tok", "u-1", {})).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(joinPortalService.joinPortal).not.toHaveBeenCalled();
    });

    it("сбой вступления возвращает слот", async () => {
        const failure = new Error("boom");
        const { service, prisma } = build({ joinFails: failure });

        await expect(service.joinViaLinkAsUser("tok", "u-1", {})).rejects.toBe(failure);

        // consume + release
        expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
});

describe("RegistrationLinksService.statusOf", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    const base = { isActive: true, revokedAt: null, expiresAt: null, maxUses: null, usesCount: 0 };

    it.each([
        ["готова", {}, "ready"],
        ["отозвана — важнее всего остального", { revokedAt: now, isActive: false }, "revoked"],
        ["выключена", { isActive: false }, "disabled"],
        ["истекла", { expiresAt: new Date("2026-10-11T00:00:00Z") }, "expired"],
        ["исчерпана", { maxUses: 1, usesCount: 1 }, "exhausted"],
        ["лимит ещё не выбран", { maxUses: 2, usesCount: 1 }, "ready"],
    ])("%s", (_name, over, expected) => {
        expect(RegistrationLinksService.statusOf({ ...base, ...over }, now)).toBe(expected);
    });
});

describe("RegistrationLinksService.create — личная ссылка", () => {
    const build = () => {
        const prisma = {
            entityDefinition: { findUnique: jest.fn().mockResolvedValue({ id: "def-1" }) },
            registrationLink: {
                create: jest
                    .fn()
                    .mockImplementation(({ data }) => Promise.resolve({ id: "l", ...data })),
            },
        };
        const presence = { countOnlineMany: jest.fn() };
        const service = new RegistrationLinksService(
            prisma as unknown as PrismaService,
            {} as never,
            {} as never,
            {} as never,
            presence as never,
            {} as never
        );
        return { service, prisma };
    };

    it("одноразовая, живёт неделю, хранит только email и непустые поля", async () => {
        const { service, prisma } = build();
        const before = Date.now();

        await service.create(
            {
                name: "Для Ñandú",
                kind: RegistrationLinkKind.personal,
                prefill: {
                    email: "  Socio@Example.com ",
                    fields: { first_name: "Ñandú", last_name: "", phone: null, extra: undefined },
                },
            } as never,
            PORTAL_ID,
            "emp-1"
        );

        const { data } = prisma.registrationLink.create.mock.calls[0][0];
        expect(data.maxUses).toBe(1);
        expect(data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 6 * 24 * 60 * 60 * 1000);
        expect(data.prefillJson).toEqual({
            email: "socio@example.com",
            fields: { first_name: "Ñandú" },
        });
    });

    it("публичная ссылка без предзаполнения не пишет prefillJson", async () => {
        const { service, prisma } = build();

        await service.create({ name: "Стойка" } as never, PORTAL_ID, "emp-1");

        const { data } = prisma.registrationLink.create.mock.calls[0][0];
        expect(data.maxUses).toBeNull();
        expect(data.expiresAt).toBeNull();
        expect(data).not.toHaveProperty("prefillJson");
    });
});
