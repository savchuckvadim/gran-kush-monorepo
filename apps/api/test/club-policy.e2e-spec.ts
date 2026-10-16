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
 * Правила клуба (TASK-717/719): вступление без ссылки, каталог вне клуба, одобрение для заказа,
 * заказ сотрудника на себя. По умолчанию всё закрыто, клуб открывает в настройках.
 */
describe("Club policy (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let ownerCookies: string;
    let portalId: string;
    let ownerUserId: string;
    const slug = `policy-${suffix}`;

    const crm = () => ({
        get: (url: string) =>
            request(app.getHttpServer())
                .get(url)
                .set("Cookie", ownerCookies)
                .set("X-Portal-Slug", slug),
        patch: (url: string) =>
            request(app.getHttpServer())
                .patch(url)
                .set("Cookie", ownerCookies)
                .set("X-Portal-Slug", slug),
        post: (url: string) =>
            request(app.getHttpServer())
                .post(url)
                .set("Cookie", ownerCookies)
                .set("X-Portal-Slug", slug),
    });

    /** A confirmed account with a cabinet session; tokens are issued directly (login limits). */
    const accountWithSession = async (label: string) => {
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
        return { userId: user.id, cookies: `member_access_token=${tokens.accessToken}` };
    };

    const cabinet = (cookies: string) => ({
        get: (url: string) =>
            request(app.getHttpServer()).get(url).set("Cookie", cookies).set("X-Portal-Slug", slug),
        post: (url: string) =>
            request(app.getHttpServer())
                .post(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", slug),
    });

    const join = (cookies: string) =>
        request(app.getHttpServer())
            .post(`/cabinet/portals/${slug}/join`)
            .set("Cookie", cookies)
            .send({ fields: { first_name: "Policy" } });

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
                displayName: `Policy ${suffix}`,
                email: `owner-${slug}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        ownerCookies = cookieHeader(res);
        portalId = res.body.portal.id as string;
        ownerUserId = (
            await prisma.user.findUniqueOrThrow({ where: { email: `owner-${slug}@test.local` } })
        ).id;
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: slug } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("starts with the closed defaults", async () => {
        const res = await crm().get("/crm/settings/club-policy");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            joinPolicy: "link_only",
            catalogOutsideClub: false,
            ordersRequireApproval: false,
            staffSelfOrders: false,
            monthlyLimitEnabled: false,
            defaultMonthlyLimitGrams: null,
        });
    });

    it("a self-join without a link is refused until the club accepts requests", async () => {
        const { userId, cookies } = await accountWithSession("self-join");

        const refused = await join(cookies);
        expect(refused.status).toBe(403);
        expect(refused.body.code).toBe("join_by_link_only");

        const opened = await crm()
            .patch("/crm/settings/club-policy")
            .send({ joinPolicy: "approval" });
        expect(opened.status).toBe(200);
        expect(opened.body.catalogOutsideClub).toBe(false);

        expect((await join(cookies)).status).toBe(201);
        expect(await prisma.member.count({ where: { userId, portalId } })).toBe(1);
    });

    it("the catalog opens in the club or when the club opens it outside", async () => {
        await crm().patch("/crm/settings/club-policy").send({ joinPolicy: "approval" });
        const { cookies } = await accountWithSession("shopper");
        expect((await join(cookies)).status).toBe(201);

        const closed = await cabinet(cookies).get("/cabinet/catalog/products");
        expect(closed.status).toBe(403);
        expect(closed.body.code).toBe("not_in_club");
        const access = await cabinet(cookies).get("/cabinet/club/shop-access");
        expect(access.body).toEqual({
            canBrowse: false,
            canOrder: false,
            reasons: ["not_in_club"],
        });

        await crm().patch("/crm/settings/club-policy").send({ catalogOutsideClub: true });
        expect((await cabinet(cookies).get("/cabinet/catalog/products")).status).toBe(200);
        const open = await cabinet(cookies).get("/cabinet/club/shop-access");
        expect(open.body).toEqual({ canBrowse: true, canOrder: true, reasons: [] });

        await crm().patch("/crm/settings/club-policy").send({ ordersRequireApproval: true });
        const unapproved = await cabinet(cookies).get("/cabinet/club/shop-access");
        expect(unapproved.body).toEqual({
            canBrowse: true,
            canOrder: false,
            reasons: ["not_approved"],
        });
        const order = await cabinet(cookies).post("/cabinet/orders").send({ items: [] });
        expect(order.status).toBe(403);
        expect(order.body.code).toBe("not_approved");
    });

    it("an employee cannot order for their own member record unless the club allows it", async () => {
        // The owner is also a member of their own club
        const record = await prisma.entityRecord.create({
            data: {
                portalId,
                entityDefinitionId: (
                    await prisma.entityDefinition.findUniqueOrThrow({
                        where: { portalId_code: { portalId, code: "member" } },
                    })
                ).id,
            },
        });
        const self = await prisma.member.create({
            data: { userId: ownerUserId, portalId, entityRecordId: record.id, isActive: true },
        });

        const refused = await crm()
            .post("/crm/orders")
            .send({
                memberId: self.id,
                items: [{ productId: "00000000-0000-4000-8000-000000000001", quantity: 1 }],
            });
        expect(refused.status).toBe(403);
        expect(refused.body.code).toBe("staff_self_order");

        await crm().patch("/crm/settings/club-policy").send({ staffSelfOrders: true });
        const allowed = await crm()
            .post("/crm/orders")
            .send({
                memberId: self.id,
                items: [{ productId: "00000000-0000-4000-8000-000000000001", quantity: 1 }],
            });
        // Несуществующий товар отклоняет уже сам заказ — запрет на себя снят
        expect(allowed.body.code).not.toBe("staff_self_order");
    });

    it("only an admin changes the rules", async () => {
        const res = await request(app.getHttpServer())
            .patch("/crm/settings/club-policy")
            .set("X-Portal-Slug", slug)
            .send({ staffSelfOrders: true });
        expect(res.status).toBe(401);
    });
});
