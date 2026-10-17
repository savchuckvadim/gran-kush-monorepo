import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
const ITEM_QUANTITY = 3;
const STOCK = 50;

type Stage = {
    id: string;
    name: string;
    semantic: string;
    sortOrder: number;
    color: string | null;
    isTerminalSuccess: boolean;
    isTerminalFailure: boolean;
};
type Funnel = { id: string; code: string; isDefault: boolean; stages: Stage[] };

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Стадии заказов (TASK-673): переведённые названия, переходы через PATCH :id/stage, склад при
 * отмене, гонка двух отмен, сводка для канбана, переименование стадии клубом.
 */
describe("Order stages (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const slug = `stages-${suffix}`;
    let portalId: string;
    let cookies: string;
    let memberId: string;
    let productId: string;
    let funnel: Funnel;

    const crm = (method: "get" | "patch", url: string, locale = "es") =>
        request(app.getHttpServer())
            [method](url)
            .set("Cookie", cookies)
            .set("X-Portal-Slug", slug)
            .set("Accept-Language", locale);

    const stageNamed = (en: string): Stage => {
        const found = funnel.stages.find((s) => s.name === en);
        if (!found) throw new Error(`stage ${en} missing`);
        return found;
    };

    const productStock = async (): Promise<number> =>
        Number(
            (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).currentQuantity
        );

    /** Заказ на одну позицию; склад уменьшается, как при оформлении участником. */
    const createOrder = async (label: string): Promise<string> => {
        const orderDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "order" },
            select: { id: true },
        });
        const record = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: orderDef.id, stageId: stageNamed("Pending").id },
        });
        const order = await prisma.order.create({
            data: {
                portalId,
                entityRecordId: record.id,
                memberId,
                orderNumber: `STG-${label}-${suffix}`,
                subtotal: 30,
                total: 30,
                items: {
                    create: {
                        productId,
                        quantity: ITEM_QUANTITY,
                        unitPrice: 10,
                        totalPrice: 30,
                    },
                },
            },
        });
        await prisma.product.update({
            where: { id: productId },
            data: { currentQuantity: { decrement: ITEM_QUANTITY } },
        });
        return order.id;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Stages ${suffix}`,
                email: `owner-stages-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        portalId = res.body.portal.id as string;
        cookies = cookieHeader(res);

        const funnels = await crm("get", "/crm/settings/entities/order/stage-categories", "en");
        expect(funnels.status).toBe(200);
        const found = (funnels.body as Funnel[]).find((f) => f.isDefault);
        if (!found) throw new Error("default order funnel missing");
        funnel = found;

        const unit = await prisma.measurementUnit.create({
            data: { portalId, code: `stg-unit-${suffix}`, name: "Gram", isCustom: true },
        });
        const category = await prisma.productCategory.create({
            data: { portalId, code: `stg-cat-${suffix}`, name: "Flowers" },
        });
        const productDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "product" },
            select: { id: true },
        });
        const productRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: productDef.id },
        });
        const product = await prisma.product.create({
            data: {
                portalId,
                entityRecordId: productRecord.id,
                categoryId: category.id,
                measurementUnitId: unit.id,
                name: `Stage product ${suffix}`,
                price: 10,
                initialQuantity: STOCK,
                currentQuantity: STOCK,
            },
        });
        productId = product.id;

        const memberDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "member" },
            select: { id: true },
        });
        const memberRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: memberDef.id },
        });
        const user = await prisma.user.create({
            data: {
                email: `member-stages-${suffix}@test.local`,
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
        // order items hold products without cascade: orders first, then the portal
        await prisma.order.deleteMany({ where: { portalId } });
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("names the system funnel stages in the request language", async () => {
        const res = await crm("get", "/crm/settings/entities/order/stage-categories", "ru");
        expect(res.status).toBe(200);
        const ru = (res.body as Funnel[]).find((f) => f.isDefault);
        expect(ru?.stages.map((s) => s.name)).toEqual([
            "Ожидает",
            "Подтверждён",
            "Готовится",
            "Готов",
            "Завершён",
            "Отменён",
        ]);
        expect(ru?.stages[0]).not.toHaveProperty("nameI18n");
    });

    it("moves an order between working stages in both directions", async () => {
        const orderId = await createOrder("move");

        const forward = await crm("patch", `/crm/orders/${orderId}/stage`, "ru").send({
            stageId: stageNamed("Preparing").id,
        });
        expect(forward.status).toBe(200);
        expect(forward.body.stage).toMatchObject({
            id: stageNamed("Preparing").id,
            name: "Готовится",
        });
        expect(forward.body.status).toBe("preparing");
        expect(forward.body.preparedAt).not.toBeNull();

        const back = await crm("patch", `/crm/orders/${orderId}/stage`).send({
            stageId: stageNamed("Confirmed").id,
        });
        expect(back.status).toBe(200);
        expect(back.body.stage.name).toBe("Confirmado");

        const column = await crm("get", `/crm/orders?stageId=${stageNamed("Confirmed").id}`);
        expect(column.status).toBe(200);
        expect(column.body.items.map((o: { id: string }) => o.id)).toContain(orderId);
    });

    it("cancelling returns the stock once and closes the order for good", async () => {
        const orderId = await createOrder("cancel");
        const before = await productStock();

        const cancelled = await crm("patch", `/crm/orders/${orderId}/stage`).send({
            stageId: stageNamed("Cancelled").id,
        });
        expect(cancelled.status).toBe(200);
        expect(cancelled.body.status).toBe("cancelled");
        expect(cancelled.body.cancelledAt).not.toBeNull();
        expect(await productStock()).toBe(before + ITEM_QUANTITY);

        const reopen = await crm("patch", `/crm/orders/${orderId}/stage`).send({
            stageId: stageNamed("Pending").id,
        });
        expect(reopen.status).toBe(400);
        expect(await productStock()).toBe(before + ITEM_QUANTITY);
    });

    it("two parallel cancels return the stock only once", async () => {
        const orderId = await createOrder("race");
        const before = await productStock();

        const results = await Promise.all(
            [0, 1].map(() =>
                crm("patch", `/crm/orders/${orderId}/stage`).send({
                    stageId: stageNamed("Cancelled").id,
                })
            )
        );
        const statuses = results.map((r) => r.status).sort();
        expect(statuses[0]).toBe(200);
        expect([200, 409]).toContain(statuses[1]);
        expect(await productStock()).toBe(before + ITEM_QUANTITY);
    });

    it("rejects a stage that is not an order stage of this club", async () => {
        const orderId = await createOrder("foreign");
        const memberFunnel = await crm("get", "/crm/settings/entities/member/stage-categories");
        const foreignId =
            (memberFunnel.body as Funnel[])[0]?.stages[0]?.id ??
            "00000000-0000-4000-8000-000000000000";

        const res = await crm("patch", `/crm/orders/${orderId}/stage`).send({ stageId: foreignId });
        expect(res.status).toBe(400);
    });

    it("summarizes count and total per stage for the kanban", async () => {
        const res = await crm("get", `/crm/orders/stages/summary?categoryId=${funnel.id}`);
        expect(res.status).toBe(200);
        const byStage = new Map(
            (res.body.stages as { stageId: string; count: number; total: number }[]).map((s) => [
                s.stageId,
                s,
            ])
        );
        expect(byStage.size).toBe(funnel.stages.length);
        expect(byStage.get(stageNamed("Cancelled").id)).toMatchObject({ count: 2, total: 60 });
        expect(byStage.get(stageNamed("Confirmed").id)).toMatchObject({ count: 1, total: 30 });

        const unknown = await crm(
            "get",
            "/crm/orders/stages/summary?categoryId=00000000-0000-4000-8000-000000000000"
        );
        expect(unknown.status).toBe(404);
    });

    it("a stage renamed by the club shows the club's word; untouched names keep translations", async () => {
        const ru = await crm("get", "/crm/settings/entities/order/stage-categories", "ru");
        const current = (ru.body as Funnel[]).find((f) => f.isDefault);
        if (!current) throw new Error("funnel missing");

        // the editor sends back what it shows: Russian names, one of them changed
        const res = await crm(
            "patch",
            `/crm/settings/entities/order/stage-categories/${funnel.id}`,
            "ru"
        ).send({
            stages: current.stages.map((s) => ({
                id: s.id,
                name: s.name === "Готовится" ? "В работе у бармена" : s.name,
                sortOrder: s.sortOrder,
                color: s.color,
                semantic: s.semantic,
                isTerminalSuccess: s.isTerminalSuccess,
                isTerminalFailure: s.isTerminalFailure,
            })),
        });
        expect(res.status).toBe(200);

        const es = await crm("get", "/crm/settings/entities/order/stage-categories", "es");
        const names = (es.body as Funnel[]).find((f) => f.isDefault)?.stages.map((s) => s.name);
        expect(names).toEqual([
            "Pendiente",
            "Confirmado",
            "В работе у бармена",
            "Listo",
            "Completado",
            "Cancelado",
        ]);
    });
});
