import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

type Club = { slug: string; cookies: string };
type ListBody = { items: { id: string; email: string }[]; total: number; totalPages: number };

/** Фильтр списка участников: поиск `q`, условия `filter` по полям анкеты, изоляция клубов. */
describe("Entity filter: CRM members list (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const clubA: Club = { slug: `filter-a-${suffix}`, cookies: "" };
    const clubB: Club = { slug: `filter-b-${suffix}`, cookies: "" };
    const emailOf = (name: string) => `${name}-${suffix}@test.local`;

    const as = (club: Club) => ({
        get: (url: string) =>
            request(app.getHttpServer())
                .get(url)
                .set("Cookie", club.cookies)
                .set("X-Portal-Slug", club.slug),
        post: (url: string) =>
            request(app.getHttpServer())
                .post(url)
                .set("Cookie", club.cookies)
                .set("X-Portal-Slug", club.slug),
        patch: (url: string) =>
            request(app.getHttpServer())
                .patch(url)
                .set("Cookie", club.cookies)
                .set("X-Portal-Slug", club.slug),
    });

    const registerClub = async (club: Club) => {
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: club.slug,
                displayName: `Filter ${club.slug}`,
                email: emailOf(`owner-${club.slug}`),
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        club.cookies = cookieHeader(res);
    };

    /** `custom` — поля не из формы crm_create: их пишут уже из карточки участника. */
    const createMember = async (
        club: Club,
        name: string,
        fields: Record<string, unknown>,
        custom?: Record<string, unknown>
    ) => {
        const res = await as(club)
            .post("/crm/members")
            .send({ email: emailOf(name), fields });
        if (res.status !== 201) {
            throw new Error(`create ${name}: ${res.status} ${JSON.stringify(res.body)}`);
        }
        if (custom) {
            const patch = await as(club)
                .patch(`/crm/members/${res.body.memberId as string}`)
                .send({ fields: custom });
            if (patch.status !== 200) {
                throw new Error(`patch ${name}: ${patch.status} ${JSON.stringify(patch.body)}`);
            }
        }
    };

    const list = async (club: Club, query: Record<string, string | number>) => {
        const res = await as(club)
            .get("/crm/members")
            .query({ limit: 100, ...query });
        return res;
    };

    const emails = (res: request.Response) =>
        (res.body as ListBody).items
            .map((m) => m.email.replace(`-${suffix}@test.local`, ""))
            .sort();

    const filter = (...conditions: { field: string; op: string; value: unknown }[]) =>
        JSON.stringify(conditions);

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        await registerClub(clubA);
        await registerClub(clubB);

        const fields = "/crm/settings/entities/member/fields";
        for (const body of [
            { fieldKey: "city", type: "single_select", label: "City", showInFilters: true },
            { fieldKey: "tags", type: "multi_select", label: "Tags" },
            { fieldKey: "visits", type: "int", label: "Visits" },
        ]) {
            expect((await as(clubA).post(fields).send(body)).status).toBe(201);
        }
        for (const [field, options] of [
            ["city", ["madrid", "barcelona"]],
            ["tags", ["vip", "new"]],
        ] as const) {
            for (const valueKey of options) {
                const res = await as(clubA)
                    .post(`${fields}/${field}/options`)
                    .send({ valueKey, label: valueKey });
                expect(res.status).toBe(201);
            }
        }
        expect(
            (
                await as(clubB)
                    .post(fields)
                    .send({ fieldKey: "only_b", type: "string", label: "Only B" })
            ).status
        ).toBe(201);

        await createMember(
            clubA,
            "ana",
            { first_name: "Ana", last_name: "García", birthday: "1990-05-10", is_medical: true },
            { city: "madrid", tags: ["vip"], visits: 12 }
        );
        await createMember(
            clubA,
            "mariana",
            {
                first_name: "Mariana",
                last_name: "López",
                birthday: "2001-01-20",
                is_medical: false,
            },
            { city: "barcelona", tags: ["new"], visits: 2 }
        );
        await createMember(
            clubA,
            "ivan",
            {
                first_name: "Иван",
                last_name: "Петров",
                phone: "+34600111222",
                birthday: "1985-12-01",
            },
            { visits: 5 }
        );
        await createMember(clubA, "ivan2", { first_name: "Иван", last_name: "Сидоров" });
        await createMember(clubA, "pct", { first_name: "50% off" });
        await createMember(clubB, "nandu-b", { first_name: "Ana" }, { only_b: "secret" });
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: { in: [clubA.slug, clubB.slug] } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    describe("q", () => {
        it("finds a substring in any text field, ignoring case, only in the own club", async () => {
            const res = await list(clubA, { q: "ANA" });
            expect(res.status).toBe(200);
            expect(emails(res)).toEqual(["ana", "mariana"]);
        });

        it("needs every word to match some field", async () => {
            expect(emails(await list(clubA, { q: "иван петров" }))).toEqual(["ivan"]);
            expect(emails(await list(clubA, { q: "иван" }))).toEqual(["ivan", "ivan2"]);
        });

        it("searches the email too", async () => {
            expect(emails(await list(clubA, { q: "mariana-" }))).toEqual(["mariana"]);
        });

        it("treats % and _ as plain characters", async () => {
            expect(emails(await list(clubA, { q: "50%" }))).toEqual(["pct"]);
            expect((await list(clubA, { q: "_" })).body.total).toBe(0);
        });
    });

    describe("filter", () => {
        it("text contains", async () => {
            const res = await list(clubA, {
                filter: filter({ field: "first_name", op: "contains", value: "riAN" }),
            });
            expect(emails(res)).toEqual(["mariana"]);
        });

        it("boolean eq", async () => {
            const res = await list(clubA, {
                filter: filter({ field: "is_medical", op: "eq", value: true }),
            });
            expect(emails(res)).toEqual(["ana"]);
        });

        it("date range", async () => {
            const res = await list(clubA, {
                filter: filter(
                    { field: "birthday", op: "gte", value: "1985-01-01" },
                    { field: "birthday", op: "lte", value: "1995-12-31" }
                ),
            });
            expect(emails(res)).toEqual(["ana", "ivan"]);
        });

        it("number range", async () => {
            const res = await list(clubA, {
                filter: filter({ field: "visits", op: "gte", value: 5 }),
            });
            expect(emails(res)).toEqual(["ana", "ivan"]);
        });

        it("select in and multi-select in", async () => {
            const city = await list(clubA, {
                filter: filter({ field: "city", op: "in", value: ["barcelona", "valencia"] }),
            });
            expect(emails(city)).toEqual(["mariana"]);

            const tags = await list(clubA, {
                filter: filter({ field: "tags", op: "in", value: ["vip"] }),
            });
            expect(emails(tags)).toEqual(["ana"]);
        });

        it("combines q and conditions with AND", async () => {
            const res = await list(clubA, {
                q: "ana",
                filter: filter({ field: "city", op: "eq", value: "madrid" }),
            });
            expect(emails(res)).toEqual(["ana"]);
        });

        it("pages the result and reports the total", async () => {
            const res = await list(clubA, { limit: 2, page: 2 });
            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(2);
            expect(res.body.total).toBe(5);
            expect(res.body.totalPages).toBe(3);
        });
    });

    describe("filter fields", () => {
        it("lists every filterable field and marks the ones shown from the start", async () => {
            const res = await as(clubA).get("/crm/settings/entities/member/filter-fields");
            expect(res.status).toBe(200);
            const byKey = new Map(
                (res.body as { fieldKey: string; showInFilters: boolean }[]).map((f) => [
                    f.fieldKey,
                    f.showInFilters,
                ])
            );
            expect(byKey.get("city")).toBe(true);
            expect(byKey.get("visits")).toBe(false);
            expect(byKey.has("signature")).toBe(false);
            expect(byKey.has("identity_document")).toBe(false);
        });
    });

    describe("rejects", () => {
        it.each([
            ["an unknown field", filter({ field: "nope", op: "eq", value: "x" })],
            ["a field of another club", filter({ field: "only_b", op: "contains", value: "s" })],
            [
                "an op the type does not support",
                filter({ field: "birthday", op: "contains", value: "19" }),
            ],
            ["a value of the wrong type", filter({ field: "visits", op: "gte", value: "5" })],
            ["an empty in-list", filter({ field: "city", op: "in", value: [] })],
            ["broken JSON", "[{"],
            ["an object instead of an array", JSON.stringify({ field: "city" })],
            [
                "an extra property",
                JSON.stringify([{ field: "city", op: "eq", value: "madrid", x: 1 }]),
            ],
        ])("%s with 400", async (_case, value) => {
            const res = await list(clubA, { filter: value });
            expect(res.status).toBe(400);
            expect(Array.isArray(res.body.errors)).toBe(true);
        });

        it("the old exact-match params", async () => {
            const res = await list(clubA, { filterFieldKey: "first_name", filterValue: "Ana" });
            expect(res.status).toBe(400);
        });
    });
});
