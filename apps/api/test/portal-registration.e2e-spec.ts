import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { LEGAL_TERMS_VERSION } from "../src/common/legal/legal-terms";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Регистрация клуба с сайта: тариф из ?plan= и откат на trial.
 */
describe("Portal registration from the product site (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const activePlanCode = `e2e-on-${suffix}`;
    const inactivePlanCode = `e2e-off-${suffix}`;
    const slugs: string[] = [];

    const registrationBody = (slug: string) => ({
        name: slug,
        displayName: `Registration ${slug}`,
        email: `owner-${slug}@test.local`,
        password: PASSWORD,
        ownerName: "Owner",
        acceptTerms: true,
    });

    const register = (slug: string, planCode?: string) => {
        slugs.push(slug);
        return request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({ ...registrationBody(slug), ...(planCode ? { planCode } : {}) });
    };

    const subscriptionPlanCode = async (portalId: string): Promise<string | undefined> => {
        const sub = await prisma.portalSubscription.findUnique({
            where: { portalId },
            include: { plan: { select: { code: true } } },
        });
        return sub?.plan.code;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        await prisma.billingPlan.createMany({
            data: [
                {
                    code: activePlanCode,
                    name: "E2E Club",
                    priceAmount: 49,
                    featuresJson: {},
                    isActive: true,
                },
                {
                    code: inactivePlanCode,
                    name: "E2E Archived",
                    priceAmount: 99,
                    featuresJson: {},
                    isActive: false,
                },
            ],
        });
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: { in: slugs } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await prisma.billingPlan.deleteMany({
            where: { code: { in: [activePlanCode, inactivePlanCode] } },
        });
        await app.close();
    });

    it("puts the new club on the chosen plan", async () => {
        const res = await register(`reg-on-${suffix}`, activePlanCode);

        expect(res.status).toBe(201);
        expect(await subscriptionPlanCode(res.body.portal.id as string)).toBe(activePlanCode);
    });

    it("falls back to the trial plan when the code is inactive", async () => {
        const res = await register(`reg-off-${suffix}`, inactivePlanCode);

        expect(res.status).toBe(201);
        expect(await subscriptionPlanCode(res.body.portal.id as string)).toBe("trial");
    });

    it("falls back to the trial plan without a code", async () => {
        const res = await register(`reg-none-${suffix}`);

        expect(res.status).toBe(201);
        expect(await subscriptionPlanCode(res.body.portal.id as string)).toBe("trial");
    });

    it("rejects a malformed plan code", async () => {
        const res = await register(`reg-bad-${suffix}`, "Club Month!");

        expect(res.status).toBe(400);
    });

    it.each([
        ["without acceptTerms", undefined],
        ["with acceptTerms: false", false],
    ])("rejects a sign-up %s", async (_case, acceptTerms) => {
        const slug = `reg-noterms-${acceptTerms === false ? "f" : "u"}-${suffix}`;
        slugs.push(slug);

        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({ ...registrationBody(slug), acceptTerms });

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
            expect.arrayContaining([expect.stringContaining("acceptTerms")])
        );
        expect(await prisma.portal.findUnique({ where: { name: slug } })).toBeNull();
    });

    describe("TASK-708: one more club and an account without clubs", () => {
        const clubBody = (slug: string) => ({
            name: slug,
            displayName: `Second ${slug}`,
            ownerName: "Owner",
            acceptTerms: true,
        });

        it("a signed-in owner founds one more club and owns it", async () => {
            const first = await register(`reg-first-${suffix}`);
            expect(first.status).toBe(201);
            const second = `reg-second-${suffix}`;
            slugs.push(second);

            const res = await request(app.getHttpServer())
                .post("/crm/my-portals")
                .set("Cookie", cookieHeader(first))
                .send(clubBody(second));

            expect(res.status).toBe(201);
            expect(res.body.portal.name).toBe(second);
            expect(res.body.owner.role).toBe("owner");
            // сессия на аккаунт, не на клуб: новых кук нет, прежняя видит оба клуба
            expect(res.headers["set-cookie"]).toBeUndefined();
            const mine = await request(app.getHttpServer())
                .get("/crm/my-portals")
                .set("Cookie", cookieHeader(first));
            expect(mine.body.portals.map((p: { slug: string }) => p.slug)).toEqual(
                expect.arrayContaining([`reg-first-${suffix}`, second])
            );
        });

        it("a reserved word or a taken slug is refused for the new club", async () => {
            const owner = await register(`reg-third-${suffix}`);
            const as = (body: Record<string, unknown>) =>
                request(app.getHttpServer())
                    .post("/crm/my-portals")
                    .set("Cookie", cookieHeader(owner))
                    .send(body);

            expect((await as(clubBody("clubs"))).status).toBe(400);
            expect((await as(clubBody(`reg-third-${suffix}`))).status).toBe(409);
        });

        it("a guest cannot found a club through the CRM endpoint", async () => {
            const res = await request(app.getHttpServer())
                .post("/crm/my-portals")
                .send(clubBody(`reg-guest-${suffix}`));
            expect(res.status).toBe(401);
        });

        it("an account without clubs signs in with its password and sees no clubs", async () => {
            const email = `no-club-${suffix}@test.local`;
            // Напрямую в БД: регистрация участника шлёт письмо, которое в jest не рендерится
            await prisma.user.create({
                data: {
                    email,
                    passwordHash: await bcrypt.hash(PASSWORD, 4),
                    status: "active",
                    isActive: true,
                    emailConfirmed: true,
                },
            });

            const login = await request(app.getHttpServer())
                .post("/crm/auth/login")
                .send({ email, password: PASSWORD });
            expect(login.status).toBe(201);
            const mine = await request(app.getHttpServer())
                .get("/crm/my-portals")
                .set("Cookie", cookieHeader(login));
            expect(mine.status).toBe(200);
            expect(mine.body.portals).toEqual([]);
        });
    });

    it("stores which terms version the owner accepted", async () => {
        const slug = `reg-terms-${suffix}`;
        const res = await register(slug);

        expect(res.status).toBe(201);
        const portal = await prisma.portal.findUniqueOrThrow({
            where: { id: res.body.portal.id as string },
            select: { termsAcceptedAt: true, termsVersion: true, termsAcceptedByUserId: true },
        });
        const owner = await prisma.user.findUniqueOrThrow({
            where: { email: `owner-${slug}@test.local` },
            select: { id: true },
        });
        expect(portal.termsVersion).toBe(LEGAL_TERMS_VERSION);
        expect(portal.termsAcceptedAt).toBeInstanceOf(Date);
        expect(portal.termsAcceptedByUserId).toBe(owner.id);
    });
});
