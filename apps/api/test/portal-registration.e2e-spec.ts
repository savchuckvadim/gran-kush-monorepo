import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

/**
 * Регистрация клуба с сайта: тариф из ?plan= и откат на trial.
 */
describe("Portal registration from the product site (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const activePlanCode = `e2e-on-${suffix}`;
    const inactivePlanCode = `e2e-off-${suffix}`;
    const slugs: string[] = [];

    const register = (slug: string, planCode?: string) => {
        slugs.push(slug);
        return request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Registration ${slug}`,
                email: `owner-${slug}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                ...(planCode ? { planCode } : {}),
            });
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
});
