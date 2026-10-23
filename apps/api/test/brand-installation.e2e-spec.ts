import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

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

/** An app under the given `BRAND`: the brand is read once, when the app is built. */
const startApp = async (brand: string | undefined): Promise<INestApplication> => {
    if (brand === undefined) delete process.env.BRAND;
    else process.env.BRAND = brand;
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    return app;
};

/**
 * Одна кодовая база — три инсталляции (TASK-793): `BRAND` задаёт тип портала, корневые модули
 * и биллинг. PafPaf — клубы, бесплатно, с дверью; Ink Space — студии, платно, без двери.
 */
describe("Brand installations (e2e)", () => {
    const previousBrand = process.env.BRAND;

    afterAll(() => {
        if (previousBrand === undefined) delete process.env.BRAND;
        else process.env.BRAND = previousBrand;
    });

    describe.each([
        { brand: undefined, code: "pafpaf", portalType: "CLUB", door: true, billing: false },
        {
            brand: "inkspace",
            code: "inkspace",
            portalType: "TATTOO_STUDIO",
            door: false,
            billing: true,
        },
    ])("BRAND=$code", ({ brand, code, portalType, door, billing }) => {
        let app: INestApplication;
        let prisma: PrismaService;
        const slug = `brand-${code}-${suffix}`;
        const email = `owner-${slug}@test.local`;
        let portalId = "";
        let cookies = "";

        const crm = (method: "get" | "patch", path: string) =>
            request(app.getHttpServer())
                [method](path)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", slug);

        beforeAll(async () => {
            app = await startApp(brand);
            prisma = app.get(PrismaService);
            const res = await request(app.getHttpServer())
                .post("/platform/portals/register")
                .send({
                    name: slug,
                    displayName: `Brand ${code}`,
                    email,
                    password: PASSWORD,
                    ownerName: "Owner",
                    acceptTerms: true,
                });
            expect(res.status).toBe(201);
            portalId = res.body.portal.id as string;
            cookies = cookieHeader(res);
        });

        afterAll(async () => {
            await prisma.portal.deleteMany({ where: { id: portalId } });
            await prisma.user.deleteMany({ where: { email } });
            await app.close();
        });

        it("health names the installation", async () => {
            const res = await request(app.getHttpServer()).get("/health");
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ status: "ok", brand: code });
            expect(typeof res.body.version).toBe("string");
        });

        it("a new portal is of the installation's kind", async () => {
            const portal = await prisma.portal.findUniqueOrThrow({ where: { id: portalId } });
            expect(portal.type).toBe(portalType);
        });

        it("door and club rules exist only where the brand offers them", async () => {
            const expected = door ? 200 : 404;
            expect((await crm("get", "/crm/presence/stats")).status).toBe(expected);
            expect((await crm("get", "/crm/settings/presence")).status).toBe(expected);
            expect((await crm("get", "/crm/settings/club-policy")).status).toBe(expected);
        });

        it("a missing module answers 404 before asking for a session", async () => {
            const res = await request(app.getHttpServer())
                .get("/cabinet/qr-code")
                .set("X-Portal-Slug", slug);
            expect(res.status).toBe(door ? 401 : 404);
        });

        it("the subscription page exists only with billing", async () => {
            expect((await crm("get", "/crm/billing")).status).toBe(billing ? 200 : 404);
        });

        it("a canceled subscription closes the CRM only with billing", async () => {
            await prisma.portalSubscription.update({
                where: { portalId },
                data: { status: "canceled", graceEndsAt: null },
            });
            expect((await crm("get", "/crm/members")).status).toBe(billing ? 402 : 200);
        });
    });
});
