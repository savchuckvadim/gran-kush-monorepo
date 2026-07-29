import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

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
    let memberUserId: string;
    let sessionBId: string;
    let billingPlanId: string;
    let measurementUnitId: string;

    const registerPortal = async (slug: string, email: string): Promise<PortalContext> => {
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
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
                email: `member-b-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
        memberUserId = memberUser.id;

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
            where: { id: { in: [portalA?.id, portalB?.id].filter(Boolean) } },
        });
        await prisma.user.deleteMany({
            where: { email: { endsWith: `${suffix}@test.local` } },
        });
        if (billingPlanId) {
            await prisma.billingPlan.deleteMany({ where: { id: billingPlanId } });
        }
        // Юнит глобальный (не каскадится с порталом) — удаляем после порталов
        if (measurementUnitId) {
            await prisma.measurementUnit.deleteMany({ where: { id: measurementUnitId } });
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

    it("allows the same user to be a member of two portals (multi-portal bridge)", async () => {
        const memberDefinitionA = await prisma.entityDefinition.findFirst({
            where: { portalId: portalA.id, code: "member" },
            select: { id: true },
        });
        expect(memberDefinitionA).not.toBeNull();

        const recordA = await prisma.entityRecord.create({
            data: {
                portalId: portalA.id,
                entityDefinitionId: memberDefinitionA!.id,
            },
        });

        const memberA = await prisma.member.create({
            data: {
                userId: memberUserId,
                portalId: portalA.id,
                entityRecordId: recordA.id,
                isActive: true,
            },
        });

        const memberships = await prisma.member.findMany({ where: { userId: memberUserId } });
        expect(memberships).toHaveLength(2);
        expect(new Set(memberships.map((m) => m.portalId))).toEqual(
            new Set([portalA.id, portalB.id])
        );

        // Сотрудник портала A видит member-мост A, но не мост B того же user
        const res = await request(app.getHttpServer())
            .get(`/crm/members/${memberA.id}`)
            .set("Cookie", portalA.cookies)
            .set("X-Portal-Slug", portalA.slug);
        expect(res.status).toBe(200);
        expect(res.body.data?.id ?? res.body.id).toBe(memberA.id);
    });

    describe("QR codes isolation", () => {
        let encryptedCodeB: string;

        beforeAll(async () => {
            // Сотрудник портала B генерирует QR своему участнику
            const res = await request(app.getHttpServer())
                .post("/crm/qr-codes/generate")
                .set("Cookie", portalB.cookies)
                .set("X-Portal-Slug", portalB.slug)
                .send({ memberId: memberBId });
            expect(res.status).toBe(201);

            const memberB = await prisma.member.findUniqueOrThrow({
                where: { id: memberBId },
                select: { entityRecordId: true },
            });
            const qr = await prisma.qrCode.findUniqueOrThrow({
                where: { entityRecordId: memberB.entityRecordId },
                select: { encryptedCode: true },
            });
            encryptedCodeB = qr.encryptedCode;
        });

        it("returns 404 for portal B member QR code requested by employee A", async () => {
            const res = await request(app.getHttpServer())
                .get(`/crm/qr-codes/member/${memberBId}`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(404);
        });

        it("rejects QR generation for portal B member by employee A", async () => {
            const res = await request(app.getHttpServer())
                .post("/crm/qr-codes/generate")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug)
                .send({ memberId: memberBId });
            expect(res.status).toBe(404);
        });

        it("rejects QR revocation for portal B member by employee A", async () => {
            const res = await request(app.getHttpServer())
                .delete(`/crm/qr-codes/member/${memberBId}`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(404);
        });

        it("invalidates portal B member QR scanned in portal A", async () => {
            const res = await request(app.getHttpServer())
                .post("/crm/qr-codes/scan")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug)
                .send({ encryptedCode: encryptedCodeB });
            expect(res.status).toBe(201);
            const result = res.body.data ?? res.body;
            expect(result.valid).toBe(false);
        });

        it("validates portal B member QR scanned in own portal", async () => {
            const res = await request(app.getHttpServer())
                .post("/crm/qr-codes/scan")
                .set("Cookie", portalB.cookies)
                .set("X-Portal-Slug", portalB.slug)
                .send({ encryptedCode: encryptedCodeB });
            expect(res.status).toBe(201);
            const result = res.body.data ?? res.body;
            expect(result.valid).toBe(true);
            expect(result.memberId).toBe(memberBId);
        });
    });

    describe("member files isolation", () => {
        it("returns 404 for portal B member document preview requested by employee A", async () => {
            const res = await request(app.getHttpServer())
                .get(
                    `/crm/members/${memberBId}/documents/00000000-0000-4000-8000-000000000000/preview`
                )
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(404);
        });

        it("returns 404 for portal B member signature preview requested by employee A", async () => {
            const res = await request(app.getHttpServer())
                .get(`/crm/members/${memberBId}/signature/preview`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(404);
        });
    });

    describe("orders isolation", () => {
        let orderBId: string;

        beforeAll(async () => {
            const orderDef = await prisma.entityDefinition.findFirst({
                where: { portalId: portalB.id, code: "order" },
                select: { id: true },
            });
            if (!orderDef) {
                throw new Error("Portal B has no provisioned 'order' entity definition");
            }

            const record = await prisma.entityRecord.create({
                data: { portalId: portalB.id, entityDefinitionId: orderDef.id },
            });

            const order = await prisma.order.create({
                data: {
                    portalId: portalB.id,
                    entityRecordId: record.id,
                    memberId: memberBId,
                    orderNumber: `ISO-${suffix}`,
                    subtotal: 10,
                    total: 10,
                },
            });
            orderBId = order.id;
        });

        it("does not list portal B orders for employee A", async () => {
            const res = await request(app.getHttpServer())
                .get("/crm/orders")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).not.toContain(orderBId);
        });

        it("returns 404 for portal B order by id", async () => {
            const res = await request(app.getHttpServer())
                .get(`/crm/orders/${orderBId}`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(404);
        });

        it("rejects status update of portal B order by employee A", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/crm/orders/${orderBId}/status`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug)
                .send({ status: "confirmed" });
            expect(res.status).toBe(404);
        });

        it("rejects payment status update of portal B order by employee A", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/crm/orders/${orderBId}/payment`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug)
                .send({ paymentStatus: "paid" });
            expect(res.status).toBe(404);
        });

        it("returns portal B order to its own employee", async () => {
            const res = await request(app.getHttpServer())
                .get(`/crm/orders/${orderBId}`)
                .set("Cookie", portalB.cookies)
                .set("X-Portal-Slug", portalB.slug);
            expect(res.status).toBe(200);
        });
    });

    describe("catalog isolation", () => {
        let productBId: string;
        let categoryBId: string;

        beforeAll(async () => {
            const productDef = await prisma.entityDefinition.findFirst({
                where: { portalId: portalB.id, code: "product" },
                select: { id: true },
            });
            if (!productDef) {
                throw new Error("Portal B has no provisioned 'product' entity definition");
            }

            const record = await prisma.entityRecord.create({
                data: { portalId: portalB.id, entityDefinitionId: productDef.id },
            });

            const unit = await prisma.measurementUnit.create({
                data: { code: `iso-unit-${suffix}`, name: "Isolation Unit", isCustom: true },
            });
            measurementUnitId = unit.id;

            const category = await prisma.productCategory.create({
                data: {
                    portalId: portalB.id,
                    code: `iso-cat-${suffix}`,
                    name: "Isolation Category",
                },
            });
            categoryBId = category.id;

            const product = await prisma.product.create({
                data: {
                    portalId: portalB.id,
                    entityRecordId: record.id,
                    categoryId: category.id,
                    measurementUnitId: unit.id,
                    name: `Isolation Product ${suffix}`,
                    price: 10,
                    initialQuantity: 100,
                    currentQuantity: 100,
                },
            });
            productBId = product.id;
        });

        it("does not list portal B products for employee A", async () => {
            const res = await request(app.getHttpServer())
                .get("/crm/catalog/products")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).not.toContain(productBId);
        });

        it("returns 404 for portal B product by id", async () => {
            const res = await request(app.getHttpServer())
                .get(`/crm/catalog/products/${productBId}`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(404);
        });

        it("rejects update of portal B product by admin A", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/crm/catalog/products/${productBId}`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug)
                .send({ name: "Hijacked" });
            expect(res.status).toBe(404);
        });

        it("does not list portal B categories for employee A", async () => {
            const res = await request(app.getHttpServer())
                .get("/crm/catalog/categories")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).not.toContain(categoryBId);
        });

        it("returns portal B product to its own employee", async () => {
            const res = await request(app.getHttpServer())
                .get(`/crm/catalog/products/${productBId}`)
                .set("Cookie", portalB.cookies)
                .set("X-Portal-Slug", portalB.slug);
            expect(res.status).toBe(200);
        });
    });

    describe("entity field definitions isolation", () => {
        const fieldKey = `iso_field_${suffix}`;

        beforeAll(async () => {
            const res = await request(app.getHttpServer())
                .post("/crm/settings/entities/member/fields")
                .set("Cookie", portalB.cookies)
                .set("X-Portal-Slug", portalB.slug)
                .send({ fieldKey, type: "string", label: "Isolation Field" });
            expect([200, 201]).toContain(res.status);
        });

        it("does not expose portal B custom field in portal A definitions", async () => {
            const res = await request(app.getHttpServer())
                .get("/crm/settings/entities/member/fields")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).not.toContain(fieldKey);
        });

        it("does not expose portal B custom field in portal A form schema", async () => {
            const res = await request(app.getHttpServer())
                .get("/crm/settings/entities/member/form-schema/crm_create")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug);
            if (res.status === 200) {
                expect(JSON.stringify(res.body)).not.toContain(fieldKey);
            } else {
                expect(res.status).toBe(404);
            }
        });

        it("exposes portal B custom field in its own portal", async () => {
            const res = await request(app.getHttpServer())
                .get("/crm/settings/entities/member/fields")
                .set("Cookie", portalB.cookies)
                .set("X-Portal-Slug", portalB.slug);
            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).toContain(fieldKey);
        });
    });

    describe("portal info", () => {
        it("returns own portal info with subscription status", async () => {
            const res = await request(app.getHttpServer())
                .get("/crm/portal/info")
                .set("Cookie", portalB.cookies)
                .set("X-Portal-Slug", portalB.slug);
            expect(res.status).toBe(200);
            const info = res.body.data ?? res.body;
            expect(info.portalId).toBe(portalB.id);
            expect(info.name).toBe(portalB.slug);
            expect(info.status).toBe("active");
        });

        it("rejects portal info of portal B for employee A", async () => {
            const res = await request(app.getHttpServer())
                .get("/crm/portal/info")
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalB.slug);
            expect(res.status).toBe(403);
        });
    });

    describe("member status change", () => {
        let memberAId: string;
        let statusItemAId: string;
        let statusItemBId: string;

        beforeAll(async () => {
            // Участник портала A
            const memberDefinitionA = await prisma.entityDefinition.findFirstOrThrow({
                where: { portalId: portalA.id, code: "member" },
                select: { id: true },
            });
            const recordA = await prisma.entityRecord.create({
                data: { portalId: portalA.id, entityDefinitionId: memberDefinitionA.id },
            });
            const userA = await prisma.user.create({
                data: {
                    email: `member-a-status-${suffix}@test.local`,
                    passwordHash: "not-a-real-hash",
                    isActive: true,
                    emailConfirmed: true,
                },
            });
            const memberA = await prisma.member.create({
                data: {
                    userId: userA.id,
                    portalId: portalA.id,
                    entityRecordId: recordA.id,
                    isActive: true,
                },
            });
            memberAId = memberA.id;

            const statusItemA = await prisma.statusItem.findFirstOrThrow({
                where: { statusSet: { portalId: portalA.id, code: "member_lifecycle" } },
                select: { id: true },
            });
            statusItemAId = statusItemA.id;

            const statusItemB = await prisma.statusItem.findFirstOrThrow({
                where: { statusSet: { portalId: portalB.id, code: "member_lifecycle" } },
                select: { id: true },
            });
            statusItemBId = statusItemB.id;
        });

        it("changes member status within own portal", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/crm/members/${memberAId}/status`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug)
                .send({ statusItemId: statusItemAId });
            expect(res.status).toBe(200);
            const member = res.body.data ?? res.body;
            expect(member.statusItem?.id).toBe(statusItemAId);
        });

        it("rejects status change of portal B member by employee A", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/crm/members/${memberBId}/status`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug)
                .send({ statusItemId: statusItemAId });
            expect(res.status).toBe(404);
        });

        it("rejects portal B status item for portal A member", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/crm/members/${memberAId}/status`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug)
                .send({ statusItemId: statusItemBId });
            expect(res.status).toBe(400);
        });

        it("rejects portal B status item in generic member PATCH", async () => {
            const res = await request(app.getHttpServer())
                .patch(`/crm/members/${memberAId}`)
                .set("Cookie", portalA.cookies)
                .set("X-Portal-Slug", portalA.slug)
                .send({ statusItemId: statusItemBId });
            expect(res.status).toBe(400);
        });
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
