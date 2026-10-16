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
 * Витрина и заказы кабинета (TASK-718): ответы в форме кабинета — без артикулов, точных остатков,
 * заметок сотрудников и данных о том, кто оформил; чужой заказ не виден; отмена — пока заказ новый.
 */
describe("Cabinet shop (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let ownerCookies: string;
    let portalId: string;
    const slug = `shop-${suffix}`;
    let inStockId: string;
    let soldOutId: string;

    const crm = (method: "get" | "post" | "patch", url: string) =>
        request(app.getHttpServer())
            [method](url)
            .set("Cookie", ownerCookies)
            .set("X-Portal-Slug", slug);

    const cabinet = (cookies: string, method: "get" | "post" | "patch", url: string) =>
        request(app.getHttpServer())[method](url).set("Cookie", cookies).set("X-Portal-Slug", slug);

    /** A confirmed account that joined the club; tokens are issued directly (login limits). */
    const shopper = async (label: string): Promise<string> => {
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
        return cookies;
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
                displayName: `Shop ${suffix}`,
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
        });
        expect(policy.status).toBe(200);

        const unit = await crm("post", "/crm/catalog/measurement-units").send({
            code: `g-${suffix}`,
            name: "Gramo",
        });
        const category = await crm("post", "/crm/catalog/categories").send({
            code: `flores-${suffix}`,
            name: "Flores",
        });
        const product = (name: string, initialQuantity: number) =>
            crm("post", "/crm/catalog/products").send({
                name,
                sku: `SKU-${name}-${suffix}`,
                price: 10,
                initialQuantity,
                minQuantity: 5,
                categoryId: category.body.id,
                measurementUnitId: unit.body.id,
            });
        inStockId = (await product("in-stock", 100)).body.id as string;
        soldOutId = (await product("sold-out", 0)).body.id as string;
    });

    afterAll(async () => {
        // order items hold products without cascade: orders first, then the portal
        await prisma.order.deleteMany({ where: { portalId } });
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("the shop shows availability, not the club's stock data", async () => {
        const cookies = await shopper("viewer");
        const res = await cabinet(cookies, "get", "/cabinet/catalog/products");
        expect(res.status).toBe(200);

        const inStock = res.body.find((p: { id: string }) => p.id === inStockId);
        expect(Object.keys(inStock).sort()).toEqual(
            [
                "category",
                "cbd",
                "description",
                "id",
                "imageUrl",
                "inStock",
                "name",
                "price",
                "strain",
                "thc",
                "unit",
            ].sort()
        );
        expect(inStock).toMatchObject({ inStock: true, price: 10, unit: { name: "Gramo" } });
        expect(res.body.find((p: { id: string }) => p.id === soldOutId).inStock).toBe(false);
    });

    it("a member orders, sees only their own orders and cancels a new one", async () => {
        const buyer = await shopper("buyer");
        const stranger = await shopper("stranger");

        const placed = await cabinet(buyer, "post", "/cabinet/orders").send({
            items: [{ productId: inStockId, quantity: 2 }],
            notes: "a las 18:00",
        });
        expect(placed.status).toBe(201);
        expect(placed.body).toMatchObject({ total: 20, canCancel: true, notes: "a las 18:00" });
        for (const internal of ["adminNotes", "member", "employee", "status"]) {
            expect(placed.body).not.toHaveProperty(internal);
        }
        expect(placed.body.items[0]).not.toHaveProperty("sku");
        const orderId = placed.body.id as string;

        const list = await cabinet(buyer, "get", "/cabinet/orders");
        expect(list.status).toBe(200);
        expect(list.body.items.map((o: { id: string }) => o.id)).toEqual([orderId]);
        expect((await cabinet(stranger, "get", "/cabinet/orders")).body.items).toEqual([]);
        expect((await cabinet(stranger, "get", `/cabinet/orders/${orderId}`)).status).toBe(404);

        const cancelled = await cabinet(buyer, "patch", `/cabinet/orders/${orderId}/cancel`).send(
            {}
        );
        expect(cancelled.status).toBe(200);
        expect(cancelled.body.canCancel).toBe(false);
        expect(cancelled.body.stage.semantic).toBe("FAILURE");
        expect(cancelled.body.cancelledAt).toEqual(expect.any(String));

        const again = await cabinet(buyer, "patch", `/cabinet/orders/${orderId}/cancel`).send({});
        expect(again.status).toBe(400);
    });
});
