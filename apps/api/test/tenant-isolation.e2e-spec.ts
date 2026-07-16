import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { PrismaService } from "../src/common/prisma/prisma.service";
import { AppModule } from "../src/app.module";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

type PortalContext = {
    id: string;
    slug: string;
    cookies: string;
};

function extractCookies(res: request.Response): string {
    const setCookie = res.headers["set-cookie"];
    const raw: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return raw.map((c) => c.split(";")[0]).join("; ");
}

describe("Cross-portal isolation (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let portalA: PortalContext;
    let portalB: PortalContext;

    // Данные портала B, к которым портал A не должен иметь доступ
    let memberBId: string;
    let sessionBId: string;
    let billingPlanId: string;

    const registerPortal = async (slug: string, email: string): Promise<PortalContext> => {
        const res = await request(app.getHttpServer()).post("/platform/portals/register").send({
            name: slug,
            displayName: `Isolation Test ${slug}`,
            email,
            password: PASSWORD,
            ownerName: "Owner",
        });
        expect(res.status).toBe(201);
        return {
            id: res.body.portal.id as string,
            slug,
            cookies: extractCookies(res),
        };
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        portalA = await registerPortal(`iso-a-${suffix}`, `owner-a-${suffix}@test.local`);
        portalB = await registerPortal(`iso-b-${suffix}`, `owner-b-${suffix}@test.local`);

        // Сидим участника и активную presence-сессию в портале B напрямую через Prisma
        const memberDefinition = await prisma.entityDefinition.findFirst({
            where: { portalId: portalB.id, code: "member" },
            select: { id: true },
        });
        if (!memberDefinition) {
            throw new Error("Portal B has no provisioned 'member' entity definition");
        }

        const entityRecord = await prisma.entityRecord.create({
            data: {
                portalId: portalB.id,
                entityDefinitionId: memberDefinition.id,
            },
        });

        const memberUser = await prisma.user.create({
            data: {
                portalId: portalB.id,
                email: `member-b-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });

        const member = await prisma.member.create({
            data: {
                userId: memberUser.id,
                portalId: portalB.id,
                entityRecordId: entityRecord.id,
                isActive: true,
            },
        });
        memberBId = member.id;

        const session = await prisma.presenceSession.create({
            data: {
                entityRecordId: entityRecord.id,
                entryMethod: "manual_employee",
            },
        });
        sessionBId = session.id;
    });

    afterAll(async () => {
        // Portal delete каскадно удаляет entity records / members / subscriptions;
        // users (и через них employees/tokens) удаляем по суффиксу вручную
        await prisma.portal.deleteMany({
            where: { id: { in: [portalA?.id, portalB?.id].filter(Boolean) as string[] } },
        });
        await prisma.user.deleteMany({
            where: { email: { endsWith: `${suffix}@test.local` } },
        });
        if (billingPlanId) {
            await prisma.billingPlan.deleteMany({ where: { id: billingPlanId } });
        }
        await app.close();
    });

    it("authenticates employee A in own portal", async () => {
        const res = await request(app.getHttpServer())
            .get("/crm/auth/me")
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalA.slug);
        expect(res.status).toBe(200);
    });

    it("rejects employee A using portal B header (PortalTenantMatchGuard)", async () => {
        const res = await request(app.getHttpServer())
            .get("/crm/members")
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalB.slug);
        expect(res.status).toBe(403);
    });

    it("does not list portal B members for employee A", async () => {
        const res = await request(app.getHttpServer())
            .get("/crm/members")
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalA.slug);
        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).not.toContain(memberBId);
    });

    it("returns 404 for portal B member by id", async () => {
        const res = await request(app.getHttpServer())
            .get(`/crm/members/${memberBId}`)
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalA.slug);
        expect(res.status).toBe(404);
    });

    it("returns 404 for portal B presence session by id", async () => {
        const res = await request(app.getHttpServer())
            .get(`/crm/presence/sessions/${sessionBId}`)
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalA.slug);
        expect(res.status).toBe(404);
    });

    it("rejects manual check-in of portal B member by employee A", async () => {
        const res = await request(app.getHttpServer())
            .post("/crm/presence/manual/check-in")
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalA.slug)
            .send({ memberId: memberBId });
        expect(res.status).toBe(404);
    });

    it("rejects manual check-out of portal B member by employee A", async () => {
        const res = await request(app.getHttpServer())
            .post("/crm/presence/manual/check-out")
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalA.slug)
            .send({ memberId: memberBId });
        expect(res.status).toBe(404);
    });

    it("does not count portal B active session in portal A stats", async () => {
        const res = await request(app.getHttpServer())
            .get("/crm/presence/stats")
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalA.slug);
        expect(res.status).toBe(200);
        const stats = res.body.data ?? res.body;
        expect(stats.currentlyPresent).toBe(0);
    });

    it("does not list portal B active session in currently-present of portal A", async () => {
        const res = await request(app.getHttpServer())
            .get("/crm/presence/currently-present")
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalA.slug);
        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).not.toContain(sessionBId);
    });

    describe("subscription gate", () => {
        beforeAll(async () => {
            const plan = await prisma.billingPlan.create({
                data: {
                    code: `iso-plan-${suffix}`,
                    name: "Isolation Test Plan",
                    priceAmount: 0,
                    featuresJson: {},
                },
            });
            billingPlanId = plan.id;
        });

        afterAll(async () => {
            await prisma.portalSubscription.deleteMany({ where: { portalId: portalA.id } });
        });

        it("returns 402 when subscription is canceled", async () => {
            // Регистрация портала может асинхронно создать trialing-подписку — используем upsert
            await prisma.portalSubscription.upsert({
                where: { portalId: portalA.id },
                create: {
                    portalId: portalA.id,
                    planId: billingPlanId,
                    status: "canceled",
                },
                update: { status: "canceled", graceEndsAt: null },
            });

            const res = await request(app.getHttpServer())
                .get("/crm/members")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(402);
        });

        it("passes past_due within grace and sets warning header", async () => {
            await prisma.portalSubscription.update({
                where: { portalId: portalA.id },
                data: {
                    status: "past_due",
                    graceEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
            });

            const res = await request(app.getHttpServer())
                .get("/crm/members")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(200);
            expect(res.headers["x-subscription-warning"]).toBe("past_due");
        });

        it("returns 402 when grace period has ended", async () => {
            await prisma.portalSubscription.update({
                where: { portalId: portalA.id },
                data: {
                    status: "past_due",
                    graceEndsAt: new Date(Date.now() - 60 * 1000),
                },
            });

            const res = await request(app.getHttpServer())
                .get("/crm/members")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(402);
        });
    });
});
