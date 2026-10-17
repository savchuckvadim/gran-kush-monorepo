import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

// свой хвост: сьюты стартуют параллельно в одну миллисекунду, а afterAll чистит по хвосту почты
const suffix = `${Date.now().toString(36)}o${Math.random().toString(36).slice(2, 6)}`;

type Stage = { id: string; name: string; isDefault?: boolean };
type Funnel = { id: string; isDefault: boolean; stages: Stage[] };
type OrderRow = { id: string };

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Порядок карточек заказов в колонке канбана: перестановка внутри стадии, перенос под соседа,
 * порядок списка `sortBy=stagePosition` (направление не спрашивается).
 */
describe("Order kanban positions (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const slug = `okanban-${suffix}`;
    let portalId: string;
    let cookies: string;
    let pending: Stage;
    let confirmed: Stage;
    let memberId: string;
    let orderDefinitionId: string;

    const crm = (method: "get" | "patch", url: string) =>
        request(app.getHttpServer())[method](url).set("Cookie", cookies).set("X-Portal-Slug", slug);

    const createOrder = async (label: string, stage: Stage): Promise<string> => {
        const record = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: orderDefinitionId, stageId: stage.id },
        });
        const order = await prisma.order.create({
            data: {
                portalId,
                entityRecordId: record.id,
                memberId,
                orderNumber: `OKB-${label}-${suffix}`,
                subtotal: 10,
                total: 10,
            },
        });
        return order.id;
    };

    const move = (id: string, stage: Stage, afterId?: string | null) =>
        crm("patch", `/crm/orders/${id}/stage`).send({
            stageId: stage.id,
            ...(afterId !== undefined ? { afterId } : {}),
        });

    /** Колонка стадии сверху вниз — только заказы этого теста. */
    const column = async (stage: Stage, ours: readonly string[], query = ""): Promise<string[]> => {
        const res = await crm(
            "get",
            `/crm/orders?stageId=${stage.id}&sortBy=stagePosition&limit=100${query}`
        );
        expect(res.status).toBe(200);
        return (res.body.items as OrderRow[]).map((o) => o.id).filter((id) => ours.includes(id));
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
                displayName: `Order kanban ${suffix}`,
                email: `owner-okanban-${suffix}@test.local`,
                password: "Password123",
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        portalId = res.body.portal.id as string;
        cookies = cookieHeader(res);

        // the stage names are translated: ask in English to find them by name
        const funnels = await crm("get", "/crm/settings/entities/order/stage-categories").set(
            "Accept-Language",
            "en"
        );
        const funnel = (funnels.body as Funnel[]).find((f) => f.isDefault);
        const byName = (name: string) => funnel?.stages.find((s) => s.name === name);
        const [pendingStage, confirmedStage] = [byName("Pending"), byName("Confirmed")];
        if (!pendingStage || !confirmedStage) throw new Error("default order stages missing");
        pending = pendingStage;
        confirmed = confirmedStage;

        const orderDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "order" },
            select: { id: true },
        });
        orderDefinitionId = orderDef.id;

        const memberDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "member" },
            select: { id: true },
        });
        const memberRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: memberDef.id },
        });
        const user = await prisma.user.create({
            data: {
                email: `member-okanban-${suffix}@test.local`,
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
        await prisma.order.deleteMany({ where: { portalId } });
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("keeps the order of cards inside a column and moves a card under its neighbour", async () => {
        const [a, b, c] = [
            await createOrder("a", pending),
            await createOrder("b", pending),
            await createOrder("c", pending),
        ];
        const ours = [a, b, c];

        expect((await move(a, pending, null)).status).toBe(200);
        expect((await move(b, pending, a)).status).toBe(200);
        expect((await move(c, pending, b)).status).toBe(200);
        expect(await column(pending, ours)).toEqual([a, b, c]);

        await move(c, pending, a);
        expect(await column(pending, ours)).toEqual([a, c, b]);

        await move(a, pending, b);
        expect(await column(pending, ours)).toEqual([c, b, a]);

        // the same stage without a neighbour changes nothing
        await move(b, pending);
        expect(await column(pending, ours)).toEqual([c, b, a]);

        // the direction of the sort is not asked: the column always reads top to bottom
        expect(await column(pending, ours, "&sortOrder=desc")).toEqual([c, b, a]);
    });

    it("puts a card that changes the stage under the chosen neighbour or on top", async () => {
        const [x, y, z] = [
            await createOrder("x", confirmed),
            await createOrder("y", pending),
            await createOrder("z", pending),
        ];
        const ours = [x, y, z];

        // no afterId: the new stage puts the card on top of the column
        expect((await move(y, confirmed)).status).toBe(200);
        expect(await column(confirmed, ours)).toEqual([y, x]);

        // under the neighbour
        expect((await move(z, confirmed, y)).status).toBe(200);
        expect(await column(confirmed, ours)).toEqual([y, z, x]);
    });
});
