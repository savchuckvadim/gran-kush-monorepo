import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MemberAuthService } from "../src/modules/portal/auth/members/application/services/member-auth.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Лимит отпуска за 30 дней (TASK-720): настройка клуба, личный лимит, расход только по товарам с
 * нормой, отмена освобождает лимит, параллельные заказы не проходят оба сверх лимита.
 */
describe("Monthly limit (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let ownerCookies: string;
    let portalId: string;
    const slug = `limit-${suffix}`;
    let countedId: string;
    let freeId: string;

    const crm = (method: "get" | "post" | "patch", url: string) =>
        request(app.getHttpServer())
            [method](url)
            .set("Cookie", ownerCookies)
            .set("X-Portal-Slug", slug);

    const cabinet = (cookies: string, method: "get" | "post" | "patch", url: string) =>
        request(app.getHttpServer())[method](url).set("Cookie", cookies).set("X-Portal-Slug", slug);

    /** A confirmed account that joined the club; returns its cookies and member id. */
    const shopper = async (label: string) => {
        const email = `${label}-${suffix}@test.local`;
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
                status: "active",
                isActive: true,
                emailConfirmed: true,
            },
        });
        const tokens = await app
            .get(MemberAuthService)
            .generateTokens({ id: user.id, email }, `device-${label}-${suffix}`);
        const cookies = `member_access_token=${tokens.accessToken}`;
        const joined = await request(app.getHttpServer())
            .post(`/cabinet/portals/${slug}/join`)
            .set("Cookie", cookies)
            .send({ fields: { first_name: label } });
        expect(joined.status).toBe(201);
        const member = await prisma.member.findFirstOrThrow({
            where: { portalId, userId: user.id },
        });
        return { cookies, memberId: member.id };
    };

    const order = (cookies: string, productId: string, quantity: number) =>
        cabinet(cookies, "post", "/cabinet/orders").send({ items: [{ productId, quantity }] });

    const limitOf = async (cookies: string) =>
        (await cabinet(cookies, "get", "/cabinet/club/monthly-limit")).body as {
            limitGrams: number | null;
            usedGrams: number;
            remainingGrams: number | null;
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
                displayName: `Limit ${suffix}`,
                email: `owner-${slug}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        ownerCookies = cookieHeader(res);
        portalId = res.body.portal.id as string;

        const policy = await crm("patch", "/crm/settings/club-policy").send({
            joinPolicy: "approval",
            catalogOutsideClub: true,
            monthlyLimitEnabled: true,
            defaultMonthlyLimitGrams: 5,
        });
        expect(policy.status).toBe(200);
        expect(policy.body).toMatchObject({
            monthlyLimitEnabled: true,
            defaultMonthlyLimitGrams: 5,
        });

        const unit = await crm("post", "/crm/catalog/measurement-units").send({
            code: `g-${suffix}`,
            name: "Gramo",
        });
        const category = await crm("post", "/crm/catalog/categories").send({
            code: `flores-${suffix}`,
            name: "Flores",
        });
        const product = (name: string, limitGramsPerUnit?: number) =>
            crm("post", "/crm/catalog/products").send({
                name,
                price: 10,
                initialQuantity: 100,
                categoryId: category.body.id,
                measurementUnitId: unit.body.id,
                limitGramsPerUnit,
            });
        const counted = await product("counted", 1);
        expect(counted.body.limitGramsPerUnit).toBe(1);
        countedId = counted.body.id as string;
        freeId = (await product("free")).body.id as string;
    });

    afterAll(async () => {
        await prisma.order.deleteMany({ where: { portalId } });
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("counts products with a norm, refuses going over and frees the limit on cancel", async () => {
        const { cookies } = await shopper("regular");

        const first = await order(cookies, countedId, 3);
        expect(first.status).toBe(201);
        expect((await order(cookies, freeId, 50)).status).toBe(201);
        expect(await limitOf(cookies)).toMatchObject({
            limitGrams: 5,
            usedGrams: 3,
            remainingGrams: 2,
        });

        const over = await order(cookies, countedId, 3);
        expect(over.status).toBe(400);
        expect(over.body).toMatchObject({ code: "monthly_limit_exceeded", remainingGrams: 2 });

        const cancelled = await cabinet(
            cookies,
            "patch",
            `/cabinet/orders/${first.body.id}/cancel`
        ).send({});
        expect(cancelled.status).toBe(200);
        expect((await limitOf(cookies)).usedGrams).toBe(0);
        expect((await order(cookies, countedId, 5)).status).toBe(201);
    });

    it("staff set a personal limit; clearing it returns the club's default", async () => {
        const { cookies, memberId } = await shopper("personal");

        const raised = await crm("patch", `/crm/members/${memberId}/monthly-limit`).send({
            monthlyLimitGrams: 10,
        });
        expect(raised.status).toBe(200);
        expect(raised.body).toMatchObject({ personalGrams: 10, limitGrams: 10, usedGrams: 0 });
        expect((await order(cookies, countedId, 8)).status).toBe(201);

        const cleared = await crm("patch", `/crm/members/${memberId}/monthly-limit`).send({
            monthlyLimitGrams: null,
        });
        expect(cleared.body).toMatchObject({
            personalGrams: null,
            limitGrams: 5,
            remainingGrams: 0,
        });
    });

    it("parallel orders of one member never pass the limit together", async () => {
        const { cookies } = await shopper("racer");

        const results = await Promise.all([
            order(cookies, countedId, 3),
            order(cookies, countedId, 3),
            order(cookies, countedId, 3),
        ]);

        expect(results.filter((res) => res.status === 201)).toHaveLength(1);
        expect(results.filter((res) => res.body.code === "monthly_limit_exceeded")).toHaveLength(2);
        expect((await limitOf(cookies)).usedGrams).toBe(3);
    });

    it("the limit applies to staff orders too", async () => {
        const { memberId } = await shopper("counter");

        const ok = await crm("post", "/crm/orders").send({
            memberId,
            items: [{ productId: countedId, quantity: 5 }],
        });
        expect(ok.status).toBe(201);
        const over = await crm("post", "/crm/orders").send({
            memberId,
            items: [{ productId: countedId, quantity: 1 }],
        });
        expect(over.status).toBe(400);
        expect(over.body.code).toBe("monthly_limit_exceeded");
    });
});
