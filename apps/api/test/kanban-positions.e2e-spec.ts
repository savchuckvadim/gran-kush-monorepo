import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

// свой хвост: сьюты стартуют параллельно в одну миллисекунду, а afterAll чистит по хвосту почты
const suffix = `${Date.now().toString(36)}k${Math.random().toString(36).slice(2, 6)}`;
const ENTITY_CODE = "deal";

interface Stage {
    id: string;
    stageCategoryId: string;
}

interface Funnel {
    id: string;
    isDefault: boolean;
    stages: Stage[];
}

interface RecordView {
    id: string;
    stage: { id: string; stageCategoryId: string } | null;
}

function extractCookies(res: request.Response): string {
    const setCookie = res.headers["set-cookie"];
    const raw: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return raw.map((c) => c.split(";")[0]).join("; ");
}

/**
 * Канбан смарт-процесса (TASK-685, TASK-686): записи одной воронки, создание в выбранной стадии,
 * порядок карточек в колонке и перенос под соседа.
 */
describe("Smart-process kanban: funnels and card order (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const slug = `kanban-${suffix}`;
    let portalId: string;
    let cookies: string;
    let main: Funnel;
    let sales: Funnel;

    const crm = (method: "get" | "post" | "patch" | "delete", url: string) =>
        request(app.getHttpServer())[method](url).set("Cookie", cookies).set("X-Portal-Slug", slug);

    const createRecord = async (title: string, stageId?: string): Promise<RecordView> => {
        const res = await crm("post", `/crm/entities/${ENTITY_CODE}/records`).send({
            fields: { title },
            ...(stageId ? { stageId } : {}),
        });
        expect(res.status).toBe(201);
        return res.body as RecordView;
    };

    const column = async (stageId: string): Promise<string[]> => {
        const res = await crm(
            "get",
            `/crm/entities/${ENTITY_CODE}/records?stageId=${stageId}&sortBy=stagePosition`
        );
        expect(res.status).toBe(200);
        return (res.body.items as RecordView[]).map((record) => record.id);
    };

    const move = (id: string, stageId: string, afterId?: string | null) =>
        crm("patch", `/crm/entities/${ENTITY_CODE}/records/${id}/stage`).send({
            stageId,
            ...(afterId !== undefined ? { afterId } : {}),
        });

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
                displayName: `Kanban ${suffix}`,
                email: `owner-kanban-${suffix}@test.local`,
                password: "Password123",
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        portalId = res.body.portal.id as string;
        cookies = extractCookies(res);

        const created = await crm("post", "/crm/entities").send({
            code: ENTITY_CODE,
            name: "Сделки",
        });
        expect(created.status).toBe(201);

        const second = await crm(
            "post",
            `/crm/settings/entities/${ENTITY_CODE}/stage-categories`
        ).send({
            code: "sales",
            name: "Продажи",
            stages: [
                { name: "Лид", sortOrder: 0, semantic: "NEW" },
                { name: "Встреча", sortOrder: 1, semantic: "IN_PROGRESS" },
            ],
        });
        expect(second.status).toBe(201);

        const funnels = await crm("get", `/crm/settings/entities/${ENTITY_CODE}/stage-categories`);
        const list = funnels.body as Funnel[];
        const foundMain = list.find((f) => f.isDefault);
        const foundSales = list.find((f) => !f.isDefault);
        if (!foundMain || !foundSales) throw new Error("funnels missing");
        main = foundMain;
        sales = foundSales;
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("creates a record in the chosen funnel stage and lists only that funnel", async () => {
        const inMain = await createRecord("main card");
        const inSales = await createRecord("sales card", sales.stages[0].id);

        expect(inMain.stage?.stageCategoryId).toBe(main.id);
        expect(inSales.stage).toMatchObject({ id: sales.stages[0].id, stageCategoryId: sales.id });

        const res = await crm(
            "get",
            `/crm/entities/${ENTITY_CODE}/records?stageCategoryId=${sales.id}`
        );
        expect(res.status).toBe(200);
        expect((res.body.items as RecordView[]).map((r) => r.id)).toEqual([inSales.id]);
    });

    it("rejects a stage of another entity on create", async () => {
        const memberFunnels = await crm("get", "/crm/settings/entities/member/stage-categories");
        const foreign = (memberFunnels.body as Funnel[])[0]?.stages[0]?.id;
        if (!foreign) return;
        const res = await crm("post", `/crm/entities/${ENTITY_CODE}/records`).send({
            fields: { title: "foreign" },
            stageId: foreign,
        });
        expect(res.status).toBe(400);
    });

    it("puts new cards on top and keeps the order set by dragging", async () => {
        const stage = sales.stages[1].id;
        const a = (await createRecord("a", stage)).id;
        const b = (await createRecord("b", stage)).id;
        const c = (await createRecord("c", stage)).id;

        // новые встают наверх: последняя созданная — первая
        const created = await column(stage);
        expect(created.indexOf(c)).toBeLessThan(created.indexOf(b));
        expect(created.indexOf(b)).toBeLessThan(created.indexOf(a));

        expect((await move(a, stage, null)).status).toBe(200);
        expect((await move(b, stage, a)).status).toBe(200);
        expect((await move(c, stage, b)).status).toBe(200);
        expect(await column(stage)).toEqual([a, b, c]);

        await move(c, stage, a);
        expect(await column(stage)).toEqual([a, c, b]);

        // та же стадия без соседа — порядок не меняется
        await move(b, stage);
        expect(await column(stage)).toEqual([a, c, b]);
    });

    it("moves a card to another funnel under the chosen neighbour", async () => {
        const target = main.stages[0].id;
        const anchor = await createRecord("anchor", target);
        const below = await createRecord("below", target);
        await move(anchor.id, target, null);
        await move(below.id, target, anchor.id);

        const card = await createRecord("travelling", sales.stages[0].id);
        const moved = await move(card.id, target, anchor.id);
        expect(moved.status).toBe(200);
        expect((moved.body as RecordView).stage).toMatchObject({
            id: target,
            stageCategoryId: main.id,
        });

        const order = await column(target);
        expect(order.indexOf(card.id)).toBe(order.indexOf(anchor.id) + 1);
        expect(order.indexOf(below.id)).toBe(order.indexOf(card.id) + 1);
    });

    it("rejects a stage change without stageId instead of reordering across the whole entity", async () => {
        const record = await createRecord("no stage id", sales.stages[0].id);
        const url = `/crm/entities/${ENTITY_CODE}/records/${record.id}/stage`;

        expect((await crm("patch", url).send({})).status).toBe(400);
        expect((await crm("patch", url).send({ afterId: null })).status).toBe(400);
        expect((await crm("patch", url).send({ stageId: "not-a-uuid" })).status).toBe(400);
    });

    describe("records survive the removal of their stage or funnel", () => {
        interface FullStage extends Stage {
            name: string;
            sortOrder: number;
            semantic: string;
        }
        let temp: { id: string; stages: FullStage[] };

        const stageOf = async (id: string): Promise<string | undefined> => {
            const res = await crm("get", `/crm/entities/${ENTITY_CODE}/records/${id}`);
            expect(res.status).toBe(200);
            return (res.body as RecordView).stage?.id;
        };

        beforeAll(async () => {
            const created = await crm(
                "post",
                `/crm/settings/entities/${ENTITY_CODE}/stage-categories`
            ).send({
                code: "temp",
                name: "Временная",
                stages: [
                    { name: "Первая", sortOrder: 0, semantic: "NEW" },
                    { name: "Вторая", sortOrder: 1, semantic: "IN_PROGRESS" },
                ],
            });
            expect(created.status).toBe(201);
            temp = created.body as typeof temp;
        });

        it("moves the records of a removed stage to the first kept stage of the funnel", async () => {
            const [first, second] = temp.stages;
            const record = await createRecord("on the second", second.id);

            const res = await crm(
                "patch",
                `/crm/settings/entities/${ENTITY_CODE}/stage-categories/${temp.id}`
            ).send({
                stages: [
                    {
                        id: first.id,
                        name: first.name,
                        sortOrder: first.sortOrder,
                        semantic: first.semantic,
                    },
                ],
            });
            expect(res.status).toBe(200);
            expect(await stageOf(record.id)).toBe(first.id);
        });

        it("moves the records of a deleted funnel to the first stage of the default funnel", async () => {
            const record = await createRecord("in the doomed funnel", temp.stages[0].id);

            const res = await crm(
                "delete",
                `/crm/settings/entities/${ENTITY_CODE}/stage-categories/${temp.id}`
            );
            expect(res.status).toBe(200);
            expect(await stageOf(record.id)).toBe(main.stages[0].id);
        });
    });
});
