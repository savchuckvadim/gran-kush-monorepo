import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

import { crmSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

type Club = { slug: string; portalId: string; cookies: string };
type SubjectRef = { kind: string; id: string; label: string | null };
type Entry = {
    kind: "event" | "comment";
    id: string;
    event?: {
        name: string;
        actor: { name: string | null };
        data: Record<string, unknown>;
        subject: SubjectRef | null;
    };
    comment?: { id: string; body: string | null; pinnedAt: string | null; subject: SubjectRef };
};
type Method = "get" | "post" | "patch" | "delete";

/**
 * Таймлайн сущности (TASK-782): события шины о заказе и участнике, комментарии персонала с
 * закреплением; права раздела и событий, автор комментария, чужой клуб — 404, страницы курсором.
 */
describe("Timeline (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let clubA: Club;
    let clubB: Club;
    let staff: string;
    let memberId: string;
    let orderId: string;
    let ownerEmployeeId: string;

    const crm = (club: Club, method: Method, path: string, cookies = club.cookies) =>
        request(app.getHttpServer())
            [method](path)
            .set("Cookie", cookies)
            .set("X-Portal-Slug", club.slug)
            .set("Origin", "http://localhost:5000");
    const timeline = async (path: string, cookies = clubA.cookies) => {
        const res = await crm(clubA, "get", `/crm/timeline/${path}`, cookies);
        expect(res.status).toBe(200);
        return res.body as {
            pinned: { id: string }[];
            entries: Entry[];
            nextCursor: string | null;
        };
    };

    const register = async (label: string): Promise<Club> => {
        const slug = `tml${label}-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Timeline ${label} ${suffix}`,
                email: `owner-tml-${label}-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        return { slug, portalId: res.body.portal.id as string, cookies: cookieHeader(res) };
    };
    const record = async (portalId: string, code: string) =>
        prisma.entityRecord.create({
            data: {
                portalId,
                entityDefinitionId: (
                    await prisma.entityDefinition.findFirstOrThrow({ where: { portalId, code } })
                ).id,
            },
        });
    const seedUser = (label: string) =>
        prisma.user.create({
            data: {
                email: `${label}-tml-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
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
        ownerEmployeeId = (
            await prisma.employee.findFirstOrThrow({ where: { portalId: clubA.portalId } })
        ).id;

        const role = await prisma.portalRole.findFirstOrThrow({
            where: { portalId: clubA.portalId, key: "employee" },
        });
        const staffUser = await seedUser("staff");
        await prisma.employee.create({
            data: {
                userId: staffUser.id,
                portalId: clubA.portalId,
                entityRecordId: (await record(clubA.portalId, "employee")).id,
                roleId: role.id,
                isActive: true,
            },
        });
        staff = (await crmSession(app, staffUser.id)).cookies;

        const memberUser = await seedUser("member");
        memberId = (
            await prisma.member.create({
                data: {
                    userId: memberUser.id,
                    portalId: clubA.portalId,
                    entityRecordId: (await record(clubA.portalId, "member")).id,
                    isActive: true,
                },
            })
        ).id;
        const unit = await prisma.measurementUnit.create({
            data: {
                portalId: clubA.portalId,
                code: `tml-u-${suffix}`,
                name: "Unit",
                isCustom: true,
            },
        });
        const category = await prisma.productCategory.create({
            data: { portalId: clubA.portalId, code: `tml-c-${suffix}`, name: "Cat" },
        });
        const product = await prisma.product.create({
            data: {
                portalId: clubA.portalId,
                entityRecordId: (await record(clubA.portalId, "product")).id,
                categoryId: category.id,
                measurementUnitId: unit.id,
                name: `Timeline ${suffix}`,
                price: 4,
                initialQuantity: 20,
                currentQuantity: 20,
            },
        });
        const order = await crm(clubA, "post", "/crm/orders").send({
            memberId,
            items: [{ productId: product.id, quantity: 1 }],
        });
        expect(order.status).toBe(201);
        orderId = order.body.id as string;
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
        expect(
            (await crm(clubA, "patch", `/crm/orders/${orderId}/stage`).send({ stageId: stage.id }))
                .status
        ).toBe(200);
    });

    afterAll(async () => {
        const portals = [clubA.portalId, clubB.portalId];
        await prisma.order.deleteMany({ where: { portalId: { in: portals } } });
        await prisma.portal.deleteMany({ where: { id: { in: portals } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("заказ: события шины с подписью стадии и именем сотрудника", async () => {
        const { entries } = await timeline(`order/${orderId}`);
        const names = entries.map((entry) => entry.event?.name);
        expect(names).toEqual(expect.arrayContaining(["order.placed", "order.stage_changed"]));
        const moved = entries.find((entry) => entry.event?.name === "order.stage_changed")!.event!;
        const toStageId = moved.data.toStageId as string;
        expect(moved.data.labels).toMatchObject({ [toStageId]: { label: expect.any(String) } });
        expect(moved.actor.name).toEqual(expect.any(String));
    });

    it("комментарии: пишет любой с правом раздела, закрепить может каждый, править — автор", async () => {
        const owner = await crm(clubA, "post", `/crm/timeline/order/${orderId}/comments`).send({
            body: "  Позвонить перед выдачей  ",
        });
        expect(owner.status).toBe(201);
        expect(owner.body).toMatchObject({ body: "Позвонить перед выдачей", pinnedAt: null });
        const mine = await crm(
            clubA,
            "post",
            `/crm/timeline/order/${orderId}/comments`,
            staff
        ).send({
            body: "Упаковал",
        });
        expect(mine.status).toBe(201);

        const pinned = await crm(clubA, "patch", `/crm/comments/${owner.body.id}`, staff).send({
            pinned: true,
        });
        expect(pinned.body.pinnedAt).not.toBeNull();
        expect((await timeline(`order/${orderId}`)).pinned.map((c) => c.id)).toEqual([
            owner.body.id,
        ]);

        const foreignEdit = await crm(clubA, "patch", `/crm/comments/${owner.body.id}`, staff).send(
            {
                body: "Чужая правка",
            }
        );
        expect(foreignEdit.status).toBe(403);
        expect(foreignEdit.body.code).toBe("comment_not_author");

        expect((await crm(clubA, "delete", `/crm/comments/${mine.body.id}`, staff)).status).toBe(
            204
        );
        const after = await timeline(`order/${orderId}`, staff);
        const deleted = after.entries.find((entry) => entry.comment?.id === mine.body.id)!.comment!;
        expect(deleted.body).toBeNull();
        expect(
            await prisma.domainEvent.count({
                where: {
                    portalId: clubA.portalId,
                    name: { in: ["comment.added", "comment.deleted"] },
                },
            })
        ).toBe(3);
    });

    it("участник: события, где он в payload, и комментарии к нему", async () => {
        await crm(clubA, "post", `/crm/timeline/member/${memberId}/comments`).send({ body: "VIP" });
        const { entries } = await timeline(`member/${memberId}`);
        expect(entries.some((entry) => entry.event?.name === "order.placed")).toBe(true);
        expect(entries.some((entry) => entry.comment?.body === "VIP")).toBe(true);
    });

    it("права и клубы: раздел без права — 403, чужой клуб и чужая сущность — 404", async () => {
        const denied = await crm(clubA, "get", `/crm/timeline/employee/${ownerEmployeeId}`, staff);
        expect(denied.status).toBe(403);
        expect(denied.body.errors).toEqual(["employees.read"]);
        expect((await crm(clubB, "get", `/crm/timeline/order/${orderId}`)).status).toBe(404);
        expect((await crm(clubA, "get", `/crm/timeline/invoice/${orderId}`)).status).toBe(404);
        const foreignComment = await crm(
            clubB,
            "post",
            `/crm/timeline/order/${orderId}/comments`
        ).send({
            body: "x",
        });
        expect(foreignComment.status).toBe(404);
    });

    it("лента клуба: события и записи команды с подписью предмета, фильтры, права", async () => {
        const post = await crm(
            clubA,
            "post",
            `/crm/timeline/portal/${clubA.portalId}/comments`
        ).send({
            body: "Сегодня закрываемся в 20:00",
        });
        expect(post.status).toBe(201);

        const feed = await timeline(`portal/${clubA.portalId}?limit=100`);
        const placed = feed.entries.find((entry) => entry.event?.name === "order.placed")!;
        expect(placed.event).toMatchObject({ subject: { kind: "order", id: orderId } });
        expect(placed.event?.subject?.label).toMatch(/^ORD-/);
        const onOrder = feed.entries.find((entry) => entry.comment?.body === "VIP")!;
        expect(onOrder.comment).toMatchObject({ subject: { kind: "member", id: memberId } });
        expect(
            feed.entries.some((entry) => entry.comment?.body === "Сегодня закрываемся в 20:00")
        ).toBe(true);

        const orders = await timeline(`portal/${clubA.portalId}?groups=order&limit=100`);
        expect(orders.entries.every((entry) => entry.event?.name.startsWith("order."))).toBe(true);
        const notes = await timeline(`portal/${clubA.portalId}?groups=comment&limit=100`);
        expect(notes.entries.every((entry) => entry.kind === "comment")).toBe(true);
        const mine = await timeline(
            `portal/${clubA.portalId}?groups=comment&authorId=${ownerEmployeeId}&limit=100`
        );
        expect(mine.entries.length).toBeGreaterThan(0);
        expect(mine.entries.every((entry) => entry.kind === "comment")).toBe(true);

        // сотрудник без employees.read не видит комментариев к сотрудникам в ленте
        await crm(clubA, "post", `/crm/timeline/employee/${ownerEmployeeId}/comments`).send({
            body: "Отпуск с понедельника",
        });
        const staffFeed = await timeline(
            `portal/${clubA.portalId}?groups=comment&limit=100`,
            staff
        );
        expect(
            staffFeed.entries.some((entry) => entry.comment?.body === "Отпуск с понедельника")
        ).toBe(false);
        expect((await crm(clubB, "get", `/crm/timeline/portal/${clubA.portalId}`)).status).toBe(
            404
        );
    });

    it("страницы курсором без повторов и пропусков", async () => {
        for (let i = 0; i < 4; i++) {
            await crm(clubA, "post", `/crm/timeline/order/${orderId}/comments`).send({
                body: `#${i}`,
            });
        }
        const all = await timeline(`order/${orderId}?limit=100`);
        const first = await timeline(`order/${orderId}?limit=3`);
        expect(first.nextCursor).not.toBeNull();
        const second = await timeline(`order/${orderId}?limit=100&cursor=${first.nextCursor}`);
        const paged = [...first.entries, ...second.entries].map((entry) => entry.id);
        expect(paged).toEqual(all.entries.map((entry) => entry.id));
        const onlyComments = await timeline(`order/${orderId}?only=comments&limit=100`);
        expect(onlyComments.entries.every((entry) => entry.kind === "comment")).toBe(true);
    });
});
