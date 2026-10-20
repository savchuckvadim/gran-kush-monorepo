import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { OrderNotificationsConsumer } from "../src/modules/notifications/application/order-notifications.consumer";
import { newProductCode } from "../src/modules/portal/crm/catalog/domain/product-code";

import { cabinetSession, crmSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
const POLL_MS = 200;
const POLL_TRIES = 75;

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

type Club = { slug: string; portalId: string; cookies: string };
type Item = { id: string; type: string; subjectId: string; params: Record<string, unknown> };

/**
 * Уведомления о заказах (TASK-781): заказ из кабинета — персоналу с orders.read, смена стадии
 * сотрудником — участнику; «прочитано», каналы аккаунта; чужой клуб уведомлений не видит,
 * повтор доставки события не дублирует.
 */
describe("Notifications (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let clubA: Club;
    let clubB: Club;
    let manager: string;
    let member: { id: string; cookies: string };
    let productId: string;
    let orderId: string;

    const crm = (
        club: Club,
        method: "get" | "post" | "put" | "patch",
        path: string,
        cookies = club.cookies
    ) =>
        request(app.getHttpServer())
            [method](path)
            .set("Cookie", cookies)
            .set("X-Portal-Slug", club.slug)
            .set("Origin", "http://localhost:5000");
    const cabinet = (method: "get" | "post" | "put", path: string) =>
        request(app.getHttpServer())
            [method](path)
            .set("Cookie", member.cookies)
            .set("X-Portal-Slug", clubA.slug);

    /** Уведомления приходят через outbox и очередь — ждём, пока появятся. */
    const eventually = async (read: () => Promise<Item[]>, match: (items: Item[]) => boolean) => {
        for (let i = 0; i < POLL_TRIES; i++) {
            const items = await read();
            if (match(items)) return items;
            await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        }
        throw new Error("notification did not arrive");
    };
    const crmItems = async (club: Club, cookies = club.cookies) =>
        (await crm(club, "get", "/crm/notifications", cookies)).body.items as Item[];
    const cabinetItems = async () =>
        (await cabinet("get", "/cabinet/notifications")).body.items as Item[];

    const register = async (label: string): Promise<Club> => {
        const slug = `ntf${label}-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Notify ${label} ${suffix}`,
                email: `owner-ntf-${label}-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        return { slug, portalId: res.body.portal.id as string, cookies: cookieHeader(res) };
    };

    const seedUser = (label: string) =>
        prisma.user.create({
            data: {
                email: `${label}-ntf-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
    const definition = (portalId: string, code: string) =>
        prisma.entityDefinition.findFirstOrThrow({ where: { portalId, code } });
    const record = async (portalId: string, code: string) =>
        prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: (await definition(portalId, code)).id },
        });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        clubA = await register("a");
        clubB = await register("b");

        const role = await prisma.portalRole.findFirstOrThrow({
            where: { portalId: clubA.portalId, key: "manager" },
        });
        const managerUser = await seedUser("manager");
        await prisma.employee.create({
            data: {
                userId: managerUser.id,
                portalId: clubA.portalId,
                entityRecordId: (await record(clubA.portalId, "employee")).id,
                roleId: role.id,
                isActive: true,
            },
        });
        manager = (await crmSession(app, managerUser.id)).cookies;

        const memberUser = await seedUser("member");
        const created = await prisma.member.create({
            data: {
                userId: memberUser.id,
                portalId: clubA.portalId,
                entityRecordId: (await record(clubA.portalId, "member")).id,
                isActive: true,
            },
        });
        await prisma.clubPolicy.create({
            data: { portalId: clubA.portalId, catalogOutsideClub: true },
        });
        member = {
            id: created.id,
            cookies: (await cabinetSession(app, memberUser.id, `device-ntf-${suffix}`)).cookies,
        };

        const unit = await prisma.measurementUnit.create({
            data: {
                portalId: clubA.portalId,
                code: `ntf-u-${suffix}`,
                name: "Unit",
                isCustom: true,
            },
        });
        const category = await prisma.productCategory.create({
            data: { portalId: clubA.portalId, code: `ntf-c-${suffix}`, name: "Cat" },
        });
        productId = (
            await prisma.product.create({
                data: {
                    portalId: clubA.portalId,
                    entityRecordId: (await record(clubA.portalId, "product")).id,
                    categoryId: category.id,
                    measurementUnitId: unit.id,
                    code: newProductCode(),
                    name: `Notify ${suffix}`,
                    price: 5,
                    initialQuantity: 50,
                    currentQuantity: 50,
                },
            })
        ).id;
    });

    afterAll(async () => {
        const portals = [clubA.portalId, clubB.portalId];
        await prisma.order.deleteMany({ where: { portalId: { in: portals } } });
        await prisma.portal.deleteMany({ where: { id: { in: portals } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("заказ из кабинета — уведомление владельцу и менеджеру с orders.read", async () => {
        const placed = await cabinet("post", "/cabinet/orders").send({
            items: [{ productId, quantity: 1 }],
        });
        expect(placed.status).toBe(201);
        orderId = placed.body.id as string;
        const orderNumber = placed.body.orderNumber as string;

        const isPlaced = (items: Item[]) =>
            items.some((item) => item.type === "order.placed" && item.subjectId === orderId);
        const owner = await eventually(() => crmItems(clubA), isPlaced);
        expect(owner.find((item) => item.subjectId === orderId)?.params).toMatchObject({
            orderNumber,
            itemCount: 1,
        });
        await eventually(() => crmItems(clubA, manager), isPlaced);
        expect((await crm(clubA, "get", "/crm/notifications/unread-count")).body.unread).toBe(1);
    });

    it("сотрудник сменил стадию — уведомление участнику со словом клуба", async () => {
        const stage = await prisma.stage.findFirstOrThrow({
            where: {
                semantic: "IN_PROGRESS",
                stageCategory: {
                    portalId: clubA.portalId,
                    isDefault: true,
                    entityDefinition: { code: "order" },
                },
            },
        });
        const moved = await crm(clubA, "patch", `/crm/orders/${orderId}/stage`).send({
            stageId: stage.id,
        });
        expect(moved.status).toBe(200);

        const items = await eventually(cabinetItems, (list) =>
            list.some((item) => item.type === "order.stage_changed")
        );
        expect(items.find((item) => item.type === "order.stage_changed")?.params).toMatchObject({
            stage: { label: stage.name },
        });
        // сотрудник свой ход в колокольчик не получает
        const owner = await crmItems(clubA);
        expect(owner.some((item) => item.type === "order.stage_changed")).toBe(false);
    });

    it("прочитано: одно или все; повтор доставки события не дублирует уведомления", async () => {
        const [first] = await crmItems(clubA);
        expect(
            (await crm(clubA, "post", "/crm/notifications/read").send({ ids: [first.id] })).status
        ).toBe(204);
        expect((await crm(clubA, "get", "/crm/notifications/unread-count")).body.unread).toBe(0);
        expect(
            (await crm(clubA, "get", "/crm/notifications/unread-count", manager)).body.unread
        ).toBe(1);
        await crm(clubA, "post", "/crm/notifications/read", manager).send({});
        expect(
            (await crm(clubA, "get", "/crm/notifications/unread-count", manager)).body.unread
        ).toBe(0);

        const stored = await prisma.domainEvent.findFirstOrThrow({
            where: { portalId: clubA.portalId, name: "order.placed", aggregateId: orderId },
        });
        const before = await prisma.notification.count({ where: { eventId: stored.id } });
        await app.get(OrderNotificationsConsumer).onOrderEvent({
            id: stored.id,
            name: "order.placed",
            version: stored.version,
            portalId: stored.portalId,
            occurredAt: stored.occurredAt.toISOString(),
            actor: { kind: stored.actorKind, id: stored.actorId },
            aggregate: { kind: "order", id: orderId },
            payload: stored.payload,
        } as Parameters<OrderNotificationsConsumer["onOrderEvent"]>[0]);
        expect(await prisma.notification.count({ where: { eventId: stored.id } })).toBe(before);
    });

    it("другой клуб уведомлений клуба A не видит", async () => {
        expect(await crmItems(clubB)).toEqual([]);
        const foreign = await request(app.getHttpServer())
            .get("/cabinet/notifications")
            .set("Cookie", member.cookies)
            .set("X-Portal-Slug", clubB.slug);
        expect(foreign.status).toBe(403);
    });

    it("канал Telegram аккаунта: по умолчанию включён, его можно выключить", async () => {
        const initial = await crm(clubA, "get", "/crm/notifications/preferences");
        expect(initial.body).toEqual({ telegram: true, telegramLinked: false });
        const off = await cabinet("put", "/cabinet/notifications/preferences").send({
            telegram: false,
        });
        expect(off.body).toEqual({ telegram: false, telegramLinked: false });
        expect((await cabinet("get", "/cabinet/notifications/preferences")).body.telegram).toBe(
            false
        );
    });
});
