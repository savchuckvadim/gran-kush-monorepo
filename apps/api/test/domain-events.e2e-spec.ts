import { INestApplication, Injectable } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import type { DomainEvent } from "@workspace/domain-events";
import type { Job } from "bullmq";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { DomainEventPublisher, OnDomainEvent } from "../src/modules/events";
import type { DeliverJobData } from "../src/modules/events/infrastructure/deliver-job";
import { DomainEventsProcessor } from "../src/modules/events/infrastructure/domain-events.processor";
import { OutboxRelayService } from "../src/modules/events/infrastructure/outbox-relay.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
const STOCK = 20;

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/** Потребитель только для теста: считает, сколько раз ему доставили событие. */
@Injectable()
class ProbeConsumer {
    readonly received: string[] = [];

    @OnDomainEvent("order.stage_changed")
    onStageChanged(event: DomainEvent): void {
        this.received.push(event.id);
    }
}

type Club = { slug: string; portalId: string; cookies: string };

/**
 * Шина событий (TASK-780) на настоящих БД и Redis: событие пишется в транзакции изменения,
 * откат транзакции не оставляет события, у каждого события — портал своего агрегата, чужой клуб
 * не порождает событий, релей и доставка идемпотентны.
 */
describe("Domain events (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let clubA: Club;
    let clubB: Club;
    let memberId: string;
    let productId: string;

    const crm = (club: Club, method: "get" | "patch" | "post", url: string, slug = club.slug) =>
        request(app.getHttpServer())
            [method](url)
            .set("Cookie", club.cookies)
            .set("X-Portal-Slug", slug)
            .set("Accept-Language", "en");

    const register = async (label: string): Promise<Club> => {
        const slug = `evt${label}-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Events ${label} ${suffix}`,
                email: `owner-evt-${label}-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        return { slug, portalId: res.body.portal.id as string, cookies: cookieHeader(res) };
    };

    const eventsOf = (aggregateId: string) =>
        prisma.domainEvent.findMany({ where: { aggregateId }, orderBy: { sequence: "asc" } });

    const placeOrder = async (club: Club): Promise<string> => {
        const res = await crm(club, "post", "/crm/orders").send({
            memberId,
            items: [{ productId, quantity: 1 }],
        });
        expect(res.status).toBe(201);
        return res.body.id as string;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
            providers: [ProbeConsumer],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        clubA = await register("a");
        clubB = await register("b");

        const portalId = clubA.portalId;
        const unit = await prisma.measurementUnit.create({
            data: { portalId, code: `evt-unit-${suffix}`, name: "Gram", isCustom: true },
        });
        const category = await prisma.productCategory.create({
            data: { portalId, code: `evt-cat-${suffix}`, name: "Flowers" },
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
                    name: `Event product ${suffix}`,
                    price: 10,
                    initialQuantity: STOCK,
                    currentQuantity: STOCK,
                },
            })
        ).id;

        const memberDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "member" },
            select: { id: true },
        });
        const memberRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: memberDef.id },
        });
        const user = await prisma.user.create({
            data: {
                email: `member-evt-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
        memberId = (
            await prisma.member.create({
                data: {
                    userId: user.id,
                    portalId,
                    entityRecordId: memberRecord.id,
                    isActive: true,
                },
            })
        ).id;
    });

    afterAll(async () => {
        await prisma.order.deleteMany({
            where: { portalId: { in: [clubA.portalId, clubB.portalId] } },
        });
        await prisma.portal.deleteMany({ where: { id: { in: [clubA.portalId, clubB.portalId] } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("основание клуба — portal.founded и вступление владельца, у обоих портал клуба", async () => {
        const events = await prisma.domainEvent.findMany({
            where: {
                portalId: clubA.portalId,
                name: { in: ["portal.founded", "employee.joined"] },
            },
        });

        expect(events.map((e) => e.name).sort()).toEqual(["employee.joined", "portal.founded"]);
        const founded = events.find((e) => e.name === "portal.founded");
        expect(founded?.aggregateId).toBe(clubA.portalId);
        expect(founded?.payload).toMatchObject({ portalSlug: clubA.slug });
        expect(JSON.stringify(founded?.payload)).not.toContain("@test.local");
    });

    it("заказ: order.placed и движение склада, без сумм; смена стадии — order.stage_changed", async () => {
        const orderId = await placeOrder(clubA);
        const funnels = await crm(clubA, "get", "/crm/settings/entities/order/stage-categories");
        const stages = (
            funnels.body as { isDefault: boolean; stages: { id: string; name: string }[] }[]
        ).find((f) => f.isDefault)?.stages;
        const preparing = stages?.find((s) => s.name === "Preparing");
        if (!preparing) throw new Error("stage Preparing missing");

        const moved = await crm(clubA, "patch", `/crm/orders/${orderId}/stage`).send({
            stageId: preparing.id,
        });
        expect(moved.status).toBe(200);

        const events = await eventsOf(orderId);
        expect(events.map((e) => e.name)).toEqual(["order.placed", "order.stage_changed"]);
        for (const event of events) {
            expect(event.portalId).toBe(clubA.portalId);
            expect(JSON.stringify(event.payload)).not.toMatch(/total|price|subtotal/i);
        }
        expect(events[1]?.payload).toMatchObject({ toStageId: preparing.id, memberId });
        expect(await eventsOf(productId)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "product.stock_changed",
                    portalId: clubA.portalId,
                }),
            ])
        );
    });

    it("чужой клуб не двигает заказ и не порождает событий", async () => {
        const orderId = await placeOrder(clubA);
        const before = (await eventsOf(orderId)).length;
        const someStage = await prisma.stage.findFirstOrThrow({
            where: {
                stageCategory: { portalId: clubB.portalId, entityDefinition: { code: "order" } },
            },
            select: { id: true },
        });

        // сотрудник B в своём клубе: заказа A для него нет
        const own = await crm(clubB, "patch", `/crm/orders/${orderId}/stage`).send({
            stageId: someStage.id,
        });
        expect(own.status).toBe(404);
        // сотрудник B с заголовком клуба A: он не член клуба A
        const foreign = await crm(clubB, "patch", `/crm/orders/${orderId}/stage`, clubA.slug).send({
            stageId: someStage.id,
        });
        expect(foreign.status).toBe(403);

        expect((await eventsOf(orderId)).length).toBe(before);
        const leaked = await prisma.domainEvent.count({
            where: { portalId: clubB.portalId, aggregateId: orderId },
        });
        expect(leaked).toBe(0);
    });

    it("смена статуса участника — member.status_changed с прежним и новым статусом", async () => {
        const status = await prisma.statusItem.findFirstOrThrow({
            where: {
                isActive: true,
                statusSet: { portalId: clubA.portalId, code: "member_lifecycle" },
            },
            select: { id: true },
        });

        const res = await crm(clubA, "patch", `/crm/members/${memberId}/status`).send({
            statusItemId: status.id,
        });
        expect(res.status).toBe(200);

        const changed = (await eventsOf(memberId)).filter(
            (e) => e.name === "member.status_changed"
        );
        expect(changed).toHaveLength(1);
        expect(changed[0]).toMatchObject({
            portalId: clubA.portalId,
            actorKind: "employee",
            payload: { memberId, fromStatusItemId: null, toStatusItemId: status.id },
        });

        // тот же статус ещё раз — не изменение и не событие
        await crm(clubA, "patch", `/crm/members/${memberId}/status`).send({
            statusItemId: status.id,
        });
        expect(
            (await eventsOf(memberId)).filter((e) => e.name === "member.status_changed")
        ).toHaveLength(1);
    });

    it("откат транзакции не оставляет события", async () => {
        const publisher = app.get(DomainEventPublisher);
        let eventId = "";

        await expect(
            prisma.$transaction(async (tx) => {
                const event = await publisher.publish(tx, {
                    name: "product.changed",
                    portalId: clubA.portalId,
                    actor: { kind: "system", id: null },
                    aggregateId: productId,
                    payload: { productId, change: "updated" },
                });
                eventId = event.id;
                throw new Error("rollback");
            })
        ).rejects.toThrow("rollback");

        expect(eventId).not.toBe("");
        expect(await prisma.domainEvent.count({ where: { id: eventId } })).toBe(0);
    });

    it("релей раздаёт событие, а повтор доставки не вызывает потребителя второй раз", async () => {
        const orderId = await placeOrder(clubA);
        const stage = await prisma.stage.findFirstOrThrow({
            where: {
                stageCategory: {
                    portalId: clubA.portalId,
                    isDefault: true,
                    entityDefinition: { code: "order" },
                },
                semantic: "IN_PROGRESS",
            },
            select: { id: true },
        });
        await crm(clubA, "patch", `/crm/orders/${orderId}/stage`).send({ stageId: stage.id });
        const event = (await eventsOf(orderId)).find((e) => e.name === "order.stage_changed");
        if (!event) throw new Error("stage event missing");

        // любой инстанс может забрать событие (SKIP LOCKED) — ждём, пока его раздадут
        const relay = app.get(OutboxRelayService);
        for (let i = 0; i < 50; i++) {
            const row = await prisma.domainEvent.findUniqueOrThrow({ where: { id: event.id } });
            if (row.dispatchedAt) break;
            await relay.relayOnce();
        }
        const dispatched = await prisma.domainEvent.findUniqueOrThrow({ where: { id: event.id } });
        expect(dispatched.dispatchedAt).not.toBeNull();

        const envelope = {
            id: event.id,
            name: event.name,
            version: event.version,
            portalId: event.portalId,
            occurredAt: event.occurredAt.toISOString(),
            actor: { kind: event.actorKind, id: event.actorId },
            aggregate: { kind: event.aggregateKind, id: event.aggregateId },
            payload: event.payload,
        } as DomainEvent;
        const job = {
            name: "deliver",
            data: { event: envelope, consumer: ProbeConsumer.name },
            attemptsMade: 1,
            opts: { attempts: 5 },
        } as unknown as Job<DeliverJobData>;
        const processor = app.get(DomainEventsProcessor);
        const probe = app.get(ProbeConsumer);
        const before = probe.received.filter((id) => id === event.id).length;

        await processor.process(job);
        await processor.process(job);

        expect(probe.received.filter((id) => id === event.id).length).toBeLessThanOrEqual(1);
        expect(before + 1).toBeGreaterThanOrEqual(
            probe.received.filter((id) => id === event.id).length
        );
        const delivery = await prisma.domainEventDelivery.findUniqueOrThrow({
            where: { eventId_consumer: { eventId: event.id, consumer: ProbeConsumer.name } },
        });
        expect(delivery.deliveredAt).not.toBeNull();
    });
});
