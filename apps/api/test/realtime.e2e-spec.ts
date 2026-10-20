import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import { io, type Socket } from "socket.io-client";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PublicUrlsService } from "../src/common/config/public-urls/public-urls.service";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { SessionsService } from "../src/modules/portal/auth/sessions/application/sessions.service";

import { cabinetSession, crmSession, type TestSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
/** Сколько ждать события: релей outbox опрашивает раз в 300 мс, плюс очередь */
const DELIVERY_MS = 10_000;
/** Сколько ждать, чтобы убедиться, что событие НЕ пришло */
const SILENCE_MS = 2_500;

type Club = { slug: string; portalId: string; cookies: string };
type Envelope = {
    name: string;
    portalId: string | null;
    aggregate: { id: string };
    payload: Record<string, unknown>;
};

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Realtime (TASK-794): рукопожатие по сессии и членству, комнаты по клубу и правам, отправка по
 * аудитории события, разрыв соединения при отзыве сессии и смене прав.
 */
describe("Realtime gateway (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let url: string;
    let clubA: Club;
    let clubB: Club;
    let memberId: string;
    let otherMemberId: string;
    let productId: string;
    let member: TestSession;
    let narrowRoleId: string;
    let narrowEmployee: TestSession;
    /** Фронт CRM и фронт кабинета: у каждого приложения свой Origin */
    let origin: string;
    let cabinetOrigin: string;
    const sockets: Socket[] = [];

    const connect = (
        namespace: "crm" | "cabinet",
        options: { cookie?: string; token?: string; portal?: string; origin?: string }
    ): Socket => {
        const socket = io(`${url}/${namespace}`, {
            transports: ["websocket"],
            forceNew: true,
            reconnection: false,
            auth: { token: options.token, portal: options.portal },
            extraHeaders: {
                ...(options.cookie ? { cookie: options.cookie } : {}),
                ...(options.origin ? { origin: options.origin } : {}),
            },
        });
        sockets.push(socket);
        return socket;
    };

    const connected = (socket: Socket): Promise<void> =>
        new Promise((resolve, reject) => {
            socket.once("connect", () => resolve());
            socket.once("connect_error", (error) => reject(error));
        });

    const rejected = (socket: Socket): Promise<string> =>
        new Promise((resolve, reject) => {
            socket.once("connect", () => reject(new Error("connected unexpectedly")));
            socket.once("connect_error", (error) => resolve(error.message));
        });

    /** Первое событие с этим именем и агрегатом; null — не пришло за `ms`. */
    const nextEvent = (
        socket: Socket,
        name: string,
        aggregateId: string,
        ms = DELIVERY_MS
    ): Promise<Envelope | null> =>
        new Promise((resolve) => {
            const timer = setTimeout(() => {
                socket.off("event", onEvent);
                resolve(null);
            }, ms);
            const onEvent = (event: Envelope) => {
                if (event.name !== name || event.aggregate.id !== aggregateId) return;
                clearTimeout(timer);
                socket.off("event", onEvent);
                resolve(event);
            };
            socket.on("event", onEvent);
        });

    const disconnectedByServer = (socket: Socket, ms = DELIVERY_MS): Promise<string | null> =>
        new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), ms);
            socket.once("disconnect", (reason) => {
                clearTimeout(timer);
                resolve(reason);
            });
        });

    const crm = (club: Club, method: "get" | "patch" | "post", path: string) =>
        request(app.getHttpServer())
            [method](path)
            .set("Cookie", club.cookies)
            .set("X-Portal-Slug", club.slug)
            .set("Origin", origin);

    const register = async (label: string): Promise<Club> => {
        const slug = `rt${label}-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Realtime ${label} ${suffix}`,
                email: `owner-rt-${label}-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        return { slug, portalId: res.body.portal.id as string, cookies: cookieHeader(res) };
    };

    const createMember = async (portalId: string, label: string) => {
        const def = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "member" },
            select: { id: true },
        });
        const record = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: def.id },
        });
        const user = await prisma.user.create({
            data: {
                email: `${label}-rt-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
        const row = await prisma.member.create({
            data: { userId: user.id, portalId, entityRecordId: record.id, isActive: true },
        });
        return { userId: user.id, memberId: row.id };
    };

    const placeOrder = async (forMember: string): Promise<string> => {
        const res = await crm(clubA, "post", "/crm/orders").send({
            memberId: forMember,
            items: [{ productId, quantity: 1 }],
        });
        expect(res.status).toBe(201);
        return res.body.id as string;
    };

    const someWorkingStage = async (): Promise<string> =>
        (
            await prisma.stage.findFirstOrThrow({
                where: {
                    stageCategory: {
                        portalId: clubA.portalId,
                        isDefault: true,
                        entityDefinition: { code: "order" },
                    },
                    semantic: "IN_PROGRESS",
                },
                select: { id: true },
            })
        ).id;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.listen(0);
        url = await app.getUrl();
        url = url.replace("[::1]", "127.0.0.1");
        prisma = app.get(PrismaService);
        const urls = app.get(PublicUrlsService);
        origin = new URL(urls.crm).origin;
        cabinetOrigin = new URL(urls.cabinet).origin;

        clubA = await register("a");
        clubB = await register("b");

        const portalId = clubA.portalId;
        const unit = await prisma.measurementUnit.create({
            data: { portalId, code: `rt-unit-${suffix}`, name: "Gram", isCustom: true },
        });
        const category = await prisma.productCategory.create({
            data: { portalId, code: `rt-cat-${suffix}`, name: "Flowers" },
        });
        const productDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "product" },
            select: { id: true },
        });
        const productRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: productDef.id },
        });
        productId = (
            await prisma.product.create({
                data: {
                    portalId,
                    entityRecordId: productRecord.id,
                    categoryId: category.id,
                    measurementUnitId: unit.id,
                    name: `Realtime product ${suffix}`,
                    price: 10,
                    initialQuantity: 50,
                    currentQuantity: 50,
                },
            })
        ).id;

        const mine = await createMember(portalId, "member");
        memberId = mine.memberId;
        member = await cabinetSession(app, mine.userId);
        otherMemberId = (await createMember(portalId, "other")).memberId;

        const role = await crm(clubA, "post", "/crm/settings/roles").send({
            name: "Door only",
            permissions: ["members.read"],
        });
        expect(role.status).toBe(201);
        narrowRoleId = role.body.id as string;
        const employeeDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "employee" },
            select: { id: true },
        });
        const employeeRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: employeeDef.id },
        });
        const employeeUser = await prisma.user.create({
            data: {
                email: `door-rt-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
        await prisma.employee.create({
            data: {
                userId: employeeUser.id,
                portalId,
                entityRecordId: employeeRecord.id,
                roleId: narrowRoleId,
                isActive: true,
            },
        });
        narrowEmployee = await crmSession(app, employeeUser.id);
    });

    afterAll(async () => {
        for (const socket of sockets) socket.disconnect();
        await prisma.order.deleteMany({
            where: { portalId: { in: [clubA.portalId, clubB.portalId] } },
        });
        await prisma.portal.deleteMany({ where: { id: { in: [clubA.portalId, clubB.portalId] } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    describe("рукопожатие", () => {
        it("без сессии — unauthorized", async () => {
            await expect(rejected(connect("crm", {}))).resolves.toBe("unauthorized");
        });

        it("кука сессии с чужого Origin — отказ, со своего — соединение", async () => {
            await expect(
                rejected(connect("crm", { cookie: clubA.cookies, origin: "https://evil.example" }))
            ).resolves.toBe("origin_not_allowed");
            await expect(
                connected(connect("crm", { cookie: clubA.cookies, origin, portal: clubA.slug }))
            ).resolves.toBeUndefined();
        });

        it("кука кабинета открывает сокет кабинета только с адреса кабинета", async () => {
            await expect(
                rejected(connect("cabinet", { cookie: member.cookies, origin, portal: clubA.slug }))
            ).resolves.toBe("origin_not_allowed");
            await expect(
                connected(
                    connect("cabinet", {
                        cookie: member.cookies,
                        origin: cabinetOrigin,
                        portal: clubA.slug,
                    })
                )
            ).resolves.toBeUndefined();
        });

        it("Bearer-токен мобильного приложения — без Origin", async () => {
            await expect(
                connected(connect("cabinet", { token: member.accessToken, portal: clubA.slug }))
            ).resolves.toBeUndefined();
        });

        it("клуб, где человек не сотрудник и не участник, — forbidden", async () => {
            await expect(
                rejected(connect("crm", { cookie: clubA.cookies, origin, portal: clubB.slug }))
            ).resolves.toBe("forbidden");
            await expect(
                rejected(connect("cabinet", { token: member.accessToken, portal: clubB.slug }))
            ).resolves.toBe("forbidden");
        });

        it("токен кабинета в неймспейсе CRM не годится", async () => {
            await expect(rejected(connect("crm", { token: member.accessToken }))).resolves.toBe(
                "unauthorized"
            );
        });
    });

    describe("доставка", () => {
        it("смена стадии: сотрудник — целиком, свой участник — публичные поля, остальные — ничего", async () => {
            const owner = connect("crm", { cookie: clubA.cookies, origin, portal: clubA.slug });
            const self = connect("cabinet", { token: member.accessToken, portal: clubA.slug });
            const narrow = connect("crm", {
                token: narrowEmployee.accessToken,
                portal: clubA.slug,
            });
            const foreign = connect("crm", { cookie: clubB.cookies, origin, portal: clubB.slug });
            await Promise.all([owner, self, narrow, foreign].map(connected));

            const orderId = await placeOrder(memberId);
            const stageId = await someWorkingStage();
            const staffEvent = nextEvent(owner, "order.stage_changed", orderId);
            const memberEvent = nextEvent(self, "order.stage_changed", orderId);
            const narrowEvent = nextEvent(narrow, "order.stage_changed", orderId, SILENCE_MS * 2);
            const foreignEvent = nextEvent(foreign, "order.stage_changed", orderId, SILENCE_MS * 2);

            const moved = await crm(clubA, "patch", `/crm/orders/${orderId}/stage`).send({
                stageId,
            });
            expect(moved.status).toBe(200);

            const [toStaff, toMember, toNarrow, toForeign] = await Promise.all([
                staffEvent,
                memberEvent,
                narrowEvent,
                foreignEvent,
            ]);
            expect(toStaff).toMatchObject({
                portalId: clubA.portalId,
                payload: { toStageId: stageId },
            });
            expect(toStaff?.payload).toHaveProperty("employeeId");
            expect(toMember?.payload).toMatchObject({ orderId, toStageId: stageId, memberId });
            expect(toMember?.payload).not.toHaveProperty("employeeId");
            expect(toNarrow).toBeNull();
            expect(toForeign).toBeNull();
        });

        it("заказ другого участника своему участнику не приходит", async () => {
            const self = connect("cabinet", { token: member.accessToken, portal: clubA.slug });
            await connected(self);
            const orderId = await placeOrder(otherMemberId);
            const stageId = await someWorkingStage();
            const received = nextEvent(self, "order.stage_changed", orderId, SILENCE_MS * 2);

            await crm(clubA, "patch", `/crm/orders/${orderId}/stage`).send({ stageId });

            expect(await received).toBeNull();
        });

        it("смена статуса участника приходит в его кабинет", async () => {
            const self = connect("cabinet", { token: member.accessToken, portal: clubA.slug });
            await connected(self);
            const status = await prisma.statusItem.findFirstOrThrow({
                where: {
                    isActive: true,
                    statusSet: { portalId: clubA.portalId, code: "member_lifecycle" },
                },
                select: { id: true },
            });
            const received = nextEvent(self, "member.status_changed", memberId);

            const res = await crm(clubA, "patch", `/crm/members/${memberId}/status`).send({
                statusItemId: status.id,
            });
            expect(res.status).toBe(200);

            expect(await received).toMatchObject({
                payload: { memberId, toStatusItemId: status.id },
            });
        });
    });

    describe("разрыв соединения", () => {
        it("отзыв сессии рвёт все её сокеты — каждую вкладку", async () => {
            const session = await cabinetSession(
                app,
                (await prisma.member.findUniqueOrThrow({ where: { id: memberId } })).userId
            );
            const tabs = [1, 2, 3].map(() =>
                connect("cabinet", { token: session.accessToken, portal: clubA.slug })
            );
            await Promise.all(tabs.map(connected));
            const closed = tabs.map((socket) => disconnectedByServer(socket));

            await app.get(SessionsService).end(session.sessionId, "logout");

            expect(await Promise.all(closed)).toEqual(
                Array(tabs.length).fill("io server disconnect")
            );
        });

        it("другая сессия того же человека остаётся на связи", async () => {
            const userId = (await prisma.member.findUniqueOrThrow({ where: { id: memberId } }))
                .userId;
            const phone = await cabinetSession(app, userId);
            const laptop = await cabinetSession(app, userId);
            const phoneSocket = connect("cabinet", {
                token: phone.accessToken,
                portal: clubA.slug,
            });
            const laptopSocket = connect("cabinet", {
                token: laptop.accessToken,
                portal: clubA.slug,
            });
            await Promise.all([connected(phoneSocket), connected(laptopSocket)]);
            const laptopClosed = disconnectedByServer(laptopSocket, SILENCE_MS);

            await app.get(SessionsService).end(phone.sessionId, "logout");

            expect(await disconnectedByServer(phoneSocket)).toBe("io server disconnect");
            expect(await laptopClosed).toBeNull();
        });

        it("новые права роли — сотрудник переподключается с ними", async () => {
            const socket = connect("crm", {
                token: narrowEmployee.accessToken,
                portal: clubA.slug,
            });
            await connected(socket);
            const closed = disconnectedByServer(socket);

            const res = await crm(clubA, "patch", `/crm/settings/roles/${narrowRoleId}`).send({
                permissions: ["members.read", "orders.read"],
            });
            expect(res.status).toBe(200);
            expect(await closed).toBe("io server disconnect");

            // после переподключения событие заказа уже приходит
            const again = connect("crm", { token: narrowEmployee.accessToken, portal: clubA.slug });
            await connected(again);
            const orderId = await placeOrder(memberId);
            await expect(nextEvent(again, "order.placed", orderId)).resolves.not.toBeNull();
        });
    });
});
