import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { newProductCode } from "../src/modules/portal/crm/catalog/domain/product-code";

import { cabinetSession, crmSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

type Club = { slug: string; portalId: string; cookies: string };
type Rate = { id: string; presetCode: string | null; percent: number; isDefault: boolean };
type Method = "get" | "post" | "put" | "patch" | "delete";

const PROFILE = {
    legalForm: "association",
    vatRegime: "general",
    incomeTaxRegime: "corporate_partially_exempt",
    pricesIncludeTax: true,
    fiscalYearStartMonth: 1,
    legalName: "Asociación Tax",
};

/**
 * Ставки налога и снимок налога в заказе (TASK-797): пресет Испании при включении финансов,
 * ставка по умолчанию по режиму IVA, права finance.admin, архив только неиспользуемых ставок,
 * чужую ставку товару не назначить; заказ хранит базу и налог строк, витрина показывает цену
 * с налогом; без модуля финансов — заказ без разбивки.
 */
describe("Finance tax rates (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let clubA: Club;
    let clubB: Club;
    let manager: string;
    let memberId: string;
    let memberCookies: string;

    const crm = (club: Club, method: Method, path: string, cookies = club.cookies) =>
        request(app.getHttpServer())
            [method](path)
            .set("Cookie", cookies)
            .set("X-Portal-Slug", club.slug)
            .set("Origin", "http://localhost:5000");

    const register = async (label: string): Promise<Club> => {
        const slug = `tax${label}-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Tax ${label} ${suffix}`,
                email: `owner-tax-${label}-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        return { slug, portalId: res.body.portal.id as string, cookies: cookieHeader(res) };
    };

    const setFinance = async (club: Club, enabled: boolean) => {
        const res = await crm(club, "put", "/crm/portal/modules/finance").send({ enabled });
        expect(res.status).toBe(200);
    };

    const rates = async (club: Club, query = ""): Promise<Rate[]> => {
        const res = await crm(club, "get", `/crm/finance/tax-rates${query}`);
        expect(res.status).toBe(200);
        return res.body as Rate[];
    };
    const preset = async (club: Club, code: string) =>
        (await rates(club, "?includeArchived=true")).find((rate) => rate.presetCode === code)!;

    const newProduct = async (club: Club, name: string, price: number): Promise<string> => {
        const definition = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId: club.portalId, code: "product" },
        });
        const record = await prisma.entityRecord.create({
            data: { portalId: club.portalId, entityDefinitionId: definition.id },
        });
        const unit = await prisma.measurementUnit.create({
            data: {
                portalId: club.portalId,
                code: `u-${name}-${suffix}`,
                name: "Unit",
                isCustom: true,
            },
        });
        const category = await prisma.productCategory.create({
            data: { portalId: club.portalId, code: `c-${name}-${suffix}`, name: "Cat" },
        });
        const product = await prisma.product.create({
            data: {
                portalId: club.portalId,
                entityRecordId: record.id,
                categoryId: category.id,
                measurementUnitId: unit.id,
                code: newProductCode(),
                name: `${name} ${suffix}`,
                price,
                initialQuantity: 100,
                currentQuantity: 100,
            },
        });
        return product.id;
    };

    const seedUser = (label: string) =>
        prisma.user.create({
            data: {
                email: `${label}-tax-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });

    const seedManager = async (club: Club): Promise<string> => {
        const role = await prisma.portalRole.findFirstOrThrow({
            where: { portalId: club.portalId, key: "manager" },
        });
        const def = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId: club.portalId, code: "employee" },
        });
        const record = await prisma.entityRecord.create({
            data: { portalId: club.portalId, entityDefinitionId: def.id },
        });
        const user = await seedUser("manager");
        await prisma.employee.create({
            data: {
                userId: user.id,
                portalId: club.portalId,
                entityRecordId: record.id,
                roleId: role.id,
                isActive: true,
            },
        });
        return (await crmSession(app, user.id)).cookies;
    };

    const seedMember = async (club: Club) => {
        const def = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId: club.portalId, code: "member" },
        });
        const record = await prisma.entityRecord.create({
            data: { portalId: club.portalId, entityDefinitionId: def.id },
        });
        const user = await seedUser("member");
        const member = await prisma.member.create({
            data: {
                userId: user.id,
                portalId: club.portalId,
                entityRecordId: record.id,
                isActive: true,
            },
        });
        // витрина открыта и вне клуба: проверяем цены, а не присутствие
        await prisma.clubPolicy.create({
            data: { portalId: club.portalId, catalogOutsideClub: true },
        });
        const session = await cabinetSession(app, user.id, `device-tax-${suffix}`);
        return { memberId: member.id, cookies: session.cookies };
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        clubA = await register("a");
        clubB = await register("b");
        manager = await seedManager(clubA);
        ({ memberId, cookies: memberCookies } = await seedMember(clubA));
    });

    afterAll(async () => {
        const portals = [clubA.portalId, clubB.portalId];
        // строки заказов держат товары без каскада: сначала заказы, потом клубы
        await prisma.order.deleteMany({ where: { portalId: { in: portals } } });
        await prisma.portal.deleteMany({ where: { id: { in: portals } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("включение финансов создаёт ставки Испании, по умолчанию general; повтор не дублирует", async () => {
        expect((await crm(clubA, "get", "/crm/finance/tax-rates")).body.code).toBe(
            "module_disabled"
        );
        await setFinance(clubA, true);
        const seeded = await rates(clubA);
        expect(seeded.map((rate) => rate.presetCode)).toEqual([
            "es_general",
            "es_reduced",
            "es_super_reduced",
            "es_zero",
            "es_exempt",
            "es_not_subject",
        ]);
        expect(seeded.filter((rate) => rate.isDefault).map((rate) => rate.presetCode)).toEqual([
            "es_general",
        ]);

        await setFinance(clubA, false);
        await setFinance(clubA, true);
        expect(await rates(clubA)).toHaveLength(6);
    });

    it("режим IVA exento делает ставкой по умолчанию exenta, general — обратно", async () => {
        const save = (vatRegime: string) =>
            crm(clubA, "put", "/crm/finance/profile").send({ ...PROFILE, vatRegime });
        expect((await save("exempt")).status).toBe(200);
        expect((await preset(clubA, "es_exempt")).isDefault).toBe(true);
        expect((await save("general")).status).toBe(200);
        expect((await preset(clubA, "es_general")).isDefault).toBe(true);
        expect((await rates(clubA)).filter((rate) => rate.isDefault)).toHaveLength(1);
    });

    it("список видят все сотрудники, менять — finance.admin; у exenta процент 0", async () => {
        expect((await crm(clubA, "get", "/crm/finance/tax-rates", manager)).status).toBe(200);
        const denied = await crm(clubA, "post", "/crm/finance/tax-rates", manager).send({
            name: "IVA 5 %",
            percent: 5,
            treatment: "taxable",
        });
        expect(denied.status).toBe(403);
        expect(denied.body.errors).toEqual(["finance.admin"]);

        const custom = await crm(clubA, "post", "/crm/finance/tax-rates").send({
            name: "IVA 5 %",
            percent: 5,
            treatment: "taxable",
        });
        expect(custom.status).toBe(201);
        expect(custom.body).toMatchObject({ presetCode: null, percent: 5, isDefault: false });

        const exempt = await crm(clubA, "post", "/crm/finance/tax-rates").send({
            name: "Exenta propia",
            percent: 7,
            treatment: "exempt",
        });
        expect(exempt.body.percent).toBe(0);
        const nameless = await crm(clubA, "patch", `/crm/finance/tax-rates/${exempt.body.id}`).send(
            {
                name: null,
            }
        );
        expect(nameless.status).toBe(400);
        expect(nameless.body.code).toBe("tax_rate_name_required");
    });

    it("по умолчанию одна ставка; ни её, ни ставку товаров не убрать в архив", async () => {
        const custom = (await rates(clubA)).find((rate) => rate.percent === 5)!;
        const general = await preset(clubA, "es_general");
        expect(
            (await crm(clubA, "put", `/crm/finance/tax-rates/${custom.id}/default`)).status
        ).toBe(204);
        expect((await rates(clubA)).filter((rate) => rate.isDefault).map((r) => r.id)).toEqual([
            custom.id,
        ]);
        const archiveDefault = await crm(clubA, "delete", `/crm/finance/tax-rates/${custom.id}`);
        expect(archiveDefault.status).toBe(409);
        expect(archiveDefault.body.code).toBe("tax_rate_is_default");
        await crm(clubA, "put", `/crm/finance/tax-rates/${general.id}/default`);

        const productId = await newProduct(clubA, "rated", 5);
        const assigned = await crm(clubA, "patch", `/crm/catalog/products/${productId}`).send({
            taxRateId: custom.id,
        });
        expect(assigned.status).toBe(200);
        expect(assigned.body.taxRateId).toBe(custom.id);
        const inUse = await crm(clubA, "delete", `/crm/finance/tax-rates/${custom.id}`);
        expect(inUse.status).toBe(409);
        expect(inUse.body).toMatchObject({ code: "tax_rate_in_use", products: 1 });

        const zero = await preset(clubA, "es_zero");
        expect((await crm(clubA, "delete", `/crm/finance/tax-rates/${zero.id}`)).status).toBe(204);
        expect((await rates(clubA)).some((rate) => rate.id === zero.id)).toBe(false);
        expect((await rates(clubA, "?includeArchived=true")).some((r) => r.id === zero.id)).toBe(
            true
        );
        const archived = await crm(clubA, "patch", `/crm/catalog/products/${productId}`).send({
            taxRateId: zero.id,
        });
        expect(archived.status).toBe(400);
        expect(archived.body.code).toBe("tax_rate_archived");
    });

    it("другой клуб: свои ставки, чужую ставку товару не назначить", async () => {
        await setFinance(clubB, true);
        const foreign = await preset(clubA, "es_reduced");
        expect((await rates(clubB)).some((rate) => rate.id === foreign.id)).toBe(false);
        const productId = await newProduct(clubB, "foreign", 3);
        const res = await crm(clubB, "patch", `/crm/catalog/products/${productId}`).send({
            taxRateId: foreign.id,
        });
        expect(res.status).toBe(404);
    });

    it("заказ хранит снимок налога: цена с налогом, налог сверху, подарок без налога", async () => {
        const included = await newProduct(clubA, "included", 12.1);
        const onTop = await newProduct(clubA, "ontop", 10);
        await crm(clubA, "patch", `/crm/catalog/products/${onTop}`).send({
            priceIncludesTax: false,
        });

        const res = await crm(clubA, "post", "/crm/orders").send({
            memberId,
            items: [
                { productId: included, quantity: 1 },
                { productId: onTop, quantity: 1 },
                { productId: included, quantity: 1, isGift: true },
            ],
        });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            subtotal: 24.2,
            total: 24.2,
            netTotal: 20,
            taxTotal: 4.2,
        });
        expect(res.body.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    productId: included,
                    isGift: false,
                    totalPrice: 12.1,
                    taxPercent: 21,
                    taxTreatment: "taxable",
                    netAmount: 10,
                    taxAmount: 2.1,
                }),
                expect.objectContaining({
                    productId: onTop,
                    totalPrice: 12.1,
                    netAmount: 10,
                    taxAmount: 2.1,
                }),
                expect.objectContaining({
                    productId: included,
                    isGift: true,
                    totalPrice: 0,
                    taxAmount: 0,
                }),
            ])
        );

        const shop = await request(app.getHttpServer())
            .get("/cabinet/catalog/products")
            .set("Cookie", memberCookies)
            .set("X-Portal-Slug", clubA.slug);
        expect(shop.status).toBe(200);
        const price = (id: string) =>
            (shop.body as { id: string; price: number }[]).find((product) => product.id === id)
                ?.price;
        expect(price(onTop)).toBe(12.1);
        expect(price(included)).toBe(12.1);
    });

    it("финансы выключены — заказ без разбивки, витрина по цене каталога", async () => {
        const onTop = await newProduct(clubA, "plain", 10);
        await crm(clubA, "patch", `/crm/catalog/products/${onTop}`).send({
            priceIncludesTax: false,
        });
        await setFinance(clubA, false);

        const res = await crm(clubA, "post", "/crm/orders").send({
            memberId,
            items: [{ productId: onTop, quantity: 2 }],
        });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ total: 20, netTotal: null, taxTotal: null });
        expect(res.body.items[0]).toMatchObject({
            totalPrice: 20,
            taxPercent: null,
            taxAmount: null,
        });

        const shop = await request(app.getHttpServer())
            .get("/cabinet/catalog/products")
            .set("Cookie", memberCookies)
            .set("X-Portal-Slug", clubA.slug);
        const product = (shop.body as { id: string; price: number }[]).find((p) => p.id === onTop);
        expect(product?.price).toBe(10);
        await setFinance(clubA, true);
    });
});
